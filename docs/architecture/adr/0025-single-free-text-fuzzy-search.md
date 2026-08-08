# ADR-0025: One free-text search box over a trigger-maintained `search_text` column

**Status:** accepted · **Recorded:** 2026-08-09

## Context

Customers are looked up at a desk, mid-conversation, from whatever the person in front of you
happens to say: a household number off an ID card, a surname that may be spelled several ways, a
street, a phone number. The person searching does not know which *field* the term belongs to, and
making them choose costs time in a queue.

The data is also spread across tables — a household's number, address, phone and e-mail live on
`households`, while the names of all its persons live on `persons`. A search that only covered the
main person would miss a household someone knows by another family member's name. The same problem
exists for users, whose personnel number and name live on the linked employee record.

## Decision

**One free-text input per search screen, matched against a denormalized, lower-cased `search_text`
column that a database trigger keeps in sync.**

- `search_text` covers, for a household, its number, the names of **all** its persons, address,
  phone and e-mail; for a user, the username plus the linked employee's personnel number and name.
- Two modes are OR'd and ranked verbatim-first:
  - `like '%term%'` for the literal hit,
  - `strict_word_similarity` (`pg_trgm`, GIN-indexed) for typo tolerance.
- The similarity cutoff is `tafeladmin.search.similarityThreshold`, **read per request**, so it can
  be tuned on a running deployment ([ADR-0011](0011-configuration-hot-reload-instead-of-restarts.md)).
- The specifications live in `SearchTextSpecs` and compose with the screen's other filters
  (post-processing, cost contribution, validity) as ordinary JPA specifications.

## Consequences

- One box, any term, and a household is findable by any of its members — which is what makes it
  usable at a desk.
- Typos and spelling variants still find the record, without the searcher having to guess how the
  name was originally entered.
- Ranking verbatim hits first means an exact household number does not get buried under fuzzy
  matches.
- The threshold is tunable in production without a restart, which matters because the right value is
  a judgement about noise versus recall, not something derivable in advance.
- **The trigger is the only thing maintaining `search_text`.** A new searchable column on
  `households`, `persons`, `users` or `employees` must be added to the trigger functions too, or it
  is silently unfindable — no error, no failing test, just a search that never matches. This is the
  main hazard of the design.
- The column is denormalized duplication, and the write path pays a trigger on every insert/update of
  those tables.
- The search is substring-and-similarity based, not linguistic: no stemming, no synonyms, no phrase
  queries. Adequate for names and addresses, and a different tool from the phonetic matching used for
  duplicate detection ([ADR-0022](0022-duplicate-detection-and-merge-by-side.md)) — those solve
  different problems and are deliberately not unified.

## Alternatives considered

**Per-field search inputs.** The prior shape, and rejected: it forces the searcher to classify the
term before searching, which is exactly the step that costs time when someone is standing at the
desk.

**Query the source columns directly with `like` across a join.** Rejected: matching across
`households` and all of its `persons` in every query is both slower and far harder to rank, and no
index helps a leading-wildcard `like` on several columns at once.

**A materialized view instead of a trigger-maintained column.** Rejected: it would have to be
refreshed, and stale search results at a registration desk are worse than the trigger's write cost.

**Full-text search (`tsvector`) instead of trigrams.** Rejected: `tsvector` is built for natural
language — stemming and stop words — while the corpus here is names, numbers and addresses, where
edit-distance similarity is what actually helps.

**An external search engine.** Rejected — see [ADR-0003](0003-postgresql-as-the-only-infrastructure-dependency.md).

## References

- `backend/src/main/resources/db-migration/R__00088_fulltext_search.sql`
- `SearchTextSpecs`, `HouseholdEntity.Specs`
- `CLAUDE.md` — "Fuzzy Search"
</content>
