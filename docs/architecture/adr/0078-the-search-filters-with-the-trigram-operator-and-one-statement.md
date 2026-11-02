# ADR-0078: The search filters with the trigram operator, and a household page brings its total along

**Status:** accepted · **Recorded:** 2026-11-02

## Context

[ADR-0025](0025-single-free-text-fuzzy-search.md) settled on one search box: `like '%term%'` OR'd
with `strict_word_similarity`, over a GIN trigram index. The filter was written as
`strict_word_similarity(term, search_text) >= threshold`. PostgreSQL can only answer an *operator* of
an index's operator class from that index, never a function call, so with the function as one arm of
the `OR` the index was never used: every search computed the similarity for every row of the table,
and did it twice for a household search, since Spring Data's `findAll(spec, pageable)` follows the
page with a `count` of the same predicate. A load test of a fork of this code base showed the search
as what capped the whole application.

Measured here in a throwaway Postgres 18 with 30,000 rows of generated names and a typo that matches
8 of them: the page took about 200 ms on a sequential scan, the `count` another 200 ms.

## Decision

- **The similarity arm is the operator `term <<% search_text`** (`SearchTextSpecs.matches`, registered
  in `PgTrgmFunctionContributor`). `strict_word_similarity` stays for ranking, where it now runs only
  on rows that already matched. In the measurement above the same rows come back in under 1 ms, from
  a `BitmapOr` over the index.
- **The cutoff is a database setting for the transaction.** `<<%` takes it from
  `pg_trgm.strict_word_similarity_threshold`, not from an argument. `SearchTermNormalizer.normalize`
  sets it from `tafeladmin.search.similarityThreshold`, in the statement that folds the term, so the
  threshold is still read per request and no search can forget it.
- **A search runs in a transaction.** Outside of one the setting would last for that one statement and
  the operator would silently use the database's default, so `normalize` is
  `@Transactional(propagation = MANDATORY)` and fails loudly instead.
- **A household page and its total are one statement**, `count(id) over ()`
  (`HouseholdPageRepository.findPageWithTotal`). A page past the last result has no row to carry the
  total and takes a separate `count`. The user and employee searches keep Spring Data's page plus
  `count`: they are far smaller tables, and the issue's measurements were about households.

## Consequences

- A selective term no longer costs in proportion to the table. A term that matches much of the table
  still ends in a sequential scan, which is the right plan for it, and now without a second statement.
- The specifications no longer take a threshold, and a test that calls a specification has to
  normalize its term in the same transaction.
- `count(id) over ()` has to see every match even when only a page is wanted. With no search term that
  makes a page of the plain household list slower than the top-N sort it could otherwise be; that list
  also paid for a full `count` before.
- A new caller of `normalize` needs a transaction. Forgetting one fails on the first request rather
  than returning wrong results.

## Alternatives considered

- **Compute the similarity only when `like` finds nothing.** The fork did this (it has row-level
  security, under which it measured the index never being used). It would make the broad-term case
  cheaper too, but it changes results: a verbatim hit would no longer show similar spellings after it,
  and the total would count verbatim hits only. That is a product decision, and the index makes it
  unnecessary for now.
- **A threshold in the query, both operator and function.** `<<%` would still read the setting, so this
  removes nothing and adds a second place for the value to disagree.
- **Setting the threshold with `alter database`.** It would stop being read per request, which
  [ADR-0011](0011-configuration-hot-reload-instead-of-restarts.md) and ADR-0025 rely on.

## References

- Issue #3918; `SearchTextSpecs.kt`, `SearchTermNormalizer.kt`, `HouseholdPageRepository.kt`
- `HouseholdSearchQueriesIT` pins the statement count, the threshold and that the index can serve both
  match modes
