# ADR-0071: Search text and search term are folded by one database function

**Status:** accepted · **Recorded:** 2026-10-15

Extends [ADR-0025](0025-single-free-text-fuzzy-search.md); the single search box and the
trigger-maintained `search_text` column stay as decided there.

## Context

`search_text` was lower-cased and nothing more, and the search term was lower-cased in Kotlin. So
the accents had to match exactly: "Ozturk" never found "Öztürk", "Yilmaz" never found "Yılmaz",
"Weiss" never found "Weiß". The trigram similarity did not help either, because every accented
letter is a different trigram. Names like these are common among the people at the desk, and
whoever types them often has no way of entering the accent, or doesn't know it is there.

Folding the text is only correct when the stored text and the term are folded *the same way*. If
the two were folded by different code, any character they disagree on would make a stored name
silently unfindable, and no test that mocks one side would notice.

The employee list under Einstellungen > Mitarbeiter had a search of its own: a plain `like` on three
columns, with no typo tolerance and no ranking.

## Decision

**One SQL function, `fold_search_text(text)` = `lower(unaccent('unaccent', text))`, folds both the
stored `search_text` and the search term.**

- The trigger functions store `fold_search_text(...)` of the concatenated fields
  (`R__00134_fold_search_text_and_employee_search_text.sql`). `unaccent` is a Postgres contrib
  extension, created the same way as `pg_trgm`. Its standard rules already map `ß` to `ss`, `ı` to
  `i`, `Ł` to `L` and so on, so no custom rules file is needed. `unaccent` runs before `lower`, so a
  capital letter with a diacritic is stripped before it is lower-cased.
- The function is `STABLE`, like `unaccent()` itself: its result depends on a dictionary, so
  `IMMUTABLE` would be a promise it cannot keep. Nothing needs more. It only runs inside the triggers
  that write `search_text` and once per search for the term, and the GIN `gin_trgm_ops` indexes sit
  on the stored column, not on an expression.
- The term is folded by asking the database: `SearchTermNormalizer` runs
  `select fold_search_text(?)` once per search. The folded string then goes into the same
  `like`/`strict_word_similarity` predicates as before (`SearchTextSpecs`), so the trigram index is
  used exactly as it was.
- More fields are searchable: each person's birth date (as `DD.MM.YYYY`, the way staff type it) and
  employer for a household, and the e-mail address for a user.
- Employees get a `search_text` column with a trigger and a GIN trigram index of their own, and
  their search switches to `SearchTextSpecs`: typo-tolerant, best match first, and a term may span
  first and last name. The driver/co-driver picker (`tafel-employee-search-create`) asks for
  verbatim matches only (`verbatimOnly` on `POST /api/employees/search`). It selects a single hit on
  its own and offers "create" when there is none, so a fuzzy near miss would pick someone else or
  block creating the employee that was typed.

## Consequences

- Accents and special letters no longer matter in any of the four searches (customers, users,
  employees, Datenauskunft) or in the quick-open palette, and a name typed without them is found.
- Stored text and term cannot drift apart, because one function folds both.
- Every search costs one extra, trivial round trip to the database.
- The rule from ADR-0025 still holds and now covers `employees` as well: **the trigger is the only
  thing maintaining `search_text`**, and a new searchable column has to be added to the trigger
  functions there.
- The migration rewrites every household's `search_text` once. It runs on boot, so the first start
  of the release that brings it takes that much longer. While the deploy window lasts, the previous
  release keeps writing through the new triggers ([ADR-0069](0069-prod-is-deployed-without-downtime-and-without-a-deploy-window.md)),
  which is harmless because it never writes `search_text` itself.
- The application's database user has to be allowed to create the `unaccent` extension. It is a
  trusted extension, like `pg_trgm`.
- Folding is not transliteration: "Öztürk" is found by "Ozturk", not by "Oeztuerk".

## Alternatives considered

**Fold the term in Kotlin** (`java.text.Normalizer` plus a few replacements). This lost because it
would be a second implementation of the same rule. `Normalizer` alone does not turn `ß` into `ss` or
`ı` into `i`, and every gap between the two would show up only as a customer nobody can find.

**Fold the term inside the query** (`like '%' || fold_search_text(:term) || '%'`). This would also
fold both sides with one function. It lost because it puts a function call into every pattern of
the matching and ranking expressions, and whether the trigram index still serves those then depends
on how the planner treats the bound parameter. Folding the term up front leaves the queries exactly
as they were before.

**`unaccent` on the column at query time** (`unaccent(search_text) like ...`). This lost because no
index serves it, and `unaccent` being only `STABLE` rules out an expression index. Storing the
folded text keeps the existing indexes on a plain column.

**A custom `unaccent` rules file.** Not needed: the standard rules already cover the letters that
came up (`ß`, `ı`, Turkish, Polish and Balkan letters, Vietnamese tone marks).

## References

- Issue #3840 (item 2)
- `R__00134_fold_search_text_and_employee_search_text.sql`, `SearchTermNormalizer`,
  `SearchTextSpecs`, `EmployeeEntity.Specs`
- [ADR-0025](0025-single-free-text-fuzzy-search.md)
