# Settings Module

A small admin surface (4 files) over two unrelated configuration concerns: **mail recipients**
(who gets which automated email) and **static values** (time-boxed numeric parameters like income
limits). Both are exposed under `/api/settings` behind `@PreAuthorize("hasAuthority('SETTINGS')")`.

## Module boundary

```java
@org.springframework.modulith.ApplicationModule(
    allowedDependencies = {"base::exception"}
)
```

Confirmed — the only declared cross-module dependency is `base::exception`
(`TafelValidationException`, thrown by `updateStaticValue()` when the id doesn't exist).

**Why nothing else needs to be declared:** the entities this module manages —
`MailRecipientEntity`/`MailRecipientRepository`/`MailType`/`RecipientType` (in
`database.model.base`) and `StaticValueEntity`/`StaticValueRepository`/`StaticValueType` (in
`database.model.staticdata`) — live outside the `modules/*` package tree that Spring Modulith
enforces boundaries on. So `SettingsService` reaches directly into shared `database/model`
repositories without that counting as a `modules`-to-`modules` dependency at all. This also means
**`settings` doesn't own these tables exclusively** — see "who actually reads this data" below.

## Components

- **`SettingsController`** — two independent endpoint groups:
  - `GET`/`POST /api/settings/mail-recipients`
  - `GET /api/settings/static-values`, `POST /api/settings/static-values/{staticValueId}`
- **`internal/SettingsService`** — all the logic for both concerns (no further internal
  decomposition despite the two concerns being unrelated).
- **`model/SettingsResponseModel.kt`** — `MailRecipients` / `MailRecipientsPerMailType` /
  `MailRecipientAdresses` (note the model's own `MailRecipientType` enum duplicates
  `database.model.base.RecipientType` value-for-value: `TO`/`CC`/`BCC` — the service converts
  between them by name via `.uppercase()`/`.valueOf(...)`, not by direct reuse).
- **`model/StaticValueSettingsModel.kt`** — `StaticValueListResponse` / `StaticValueItem`.

## Mail recipients

Modeled as flat rows in `mail_recipients`: `(mailType, recipientType, address)`, no grouping table.
`MailType` (`database.model.base`) is `DAILY_REPORT`, `STATISTICS`, `RETURN_BOXES`;
`RecipientType` is `TO`/`CC`/`BCC`.

- `getMailRecipients()` groups the flat rows back into nested `MailType -> RecipientType ->
  [addresses]` for the UI.
- `updateMailRecipients()` is a **full delete-then-insert**, not a diff:
  `mailRecipientRepository.deleteAll()` followed by `saveAll(recipients)` built fresh from the
  request. Blank/whitespace-only addresses are filtered out before insert. There is no history —
  saving is destructive and unconditional; if two admins edit concurrently, the last save wins and
  silently discards the other's changes.
- **The settings module never sends mail itself.** The actual consumer is
  `common.mail.MailSenderService`, which calls `mailRecipientRepository.findAllByMailType(mailType)`
  directly (bypassing `SettingsService`/this module entirely) to build the to/cc/bcc lists when
  distribution post-processors (e.g. daily report, statistics mails) send email. This module is
  purely the CRUD admin UI backing that table.

## Static values

`StaticValueEntity` (`static_values`) rows are **time-boxed** parameters: `type` (`StaticValueType`:
`INCOME_LIMIT`, `ADDITIONAL_ADULT`, `ADDITIONAL_CHILD`, `TOLERANCE`, `FAMILY_BONUS`,
`CHILD_TAX_ALLOWANCE`, `SIBLING_ADDITION`, `COST_CONTRIBUTION`), a `BigDecimal amount`, and a
`[validFrom, validTo]` validity window, optionally further keyed by `countAdults`/`countChildren`/
`age` for lookup-table-style values (e.g. income limit by household composition).

- **`getStaticValues()` only ever returns the row currently valid "today"** per
  `(type, countAdults, countChildren, age)` — historized past/future rows (see below) are hidden
  from the admin listing on purpose, since admins only need to see/edit what applies right now.
- **`updateStaticValue()` only lets the `amount` change.** `type`/`countAdults`/`countChildren`/
  `age` are the lookup keys other code matches on (see `StaticValueRepository`'s
  `findLatestForPersonCount`/`findSingleValueOfType`/`findValuesOfType`) and are deliberately not
  editable through this endpoint — changing them here would silently break that matching
  elsewhere.
- Updates are **historized, not overwritten in place** — with one exception:
  - If the currently-valid row's `validFrom == today` (i.e. it was already edited once today),
    that same row is updated in place, to avoid stacking multiple same-day history rows.
  - Otherwise, the old row is closed (`validTo = yesterday`) and a new row is inserted running from
    `today` to a sentinel far-future end date, `FICTIVE_END_DATE = 2999-12-31` (this exact
    placeholder convention — "no known end date" — is also used in migrations/testdata, so match
    it rather than inventing e.g. `null` or `LocalDate.MAX`).
- **Caching:** `StaticValueRepository`'s three query methods are each `@Cacheable` under a
  *different* cache name (`staticValueLatestForPersonCount`, `staticValueSingle`,
  `staticValueList`) — the comment in the repository explains this is because the default Spring
  cache key generator only considers arguments, not the method, and
  `findSingleValueOfType`/`findValuesOfType` share the same argument shape and would otherwise
  collide. Values are cached for the process lifetime because household validation would
  otherwise re-query the same rows once per household. `SettingsService.updateStaticValue()` is
  annotated `@CacheEvict(cacheNames = [...three names...], allEntries = true)` to keep this safe
  despite values now being editable at runtime — **if you add a new cached query method to
  `StaticValueRepository`, add its cache name to this eviction list too, or edits made through this
  module's UI will appear to silently not take effect.**
- **Again, the settings module is admin-only — it doesn't gatekeep reads.** Actual business logic
  reads `StaticValueRepository` directly, bypassing `settings` entirely:
  `household.internal.income.IncomeValidatorServiceImpl` (income-limit/family-bonus/tolerance
  calculations) and `distribution.internal.postprocessors.MissingCostContributionPostProcessor`
  both inject `StaticValueRepository` themselves rather than going through `SettingsService`.

## Working in this module

Both concerns share one trait worth keeping in mind: **this module is the maintenance UI, not the
runtime source of truth's only reader.** When changing either `MailRecipientEntity`/`MailType`/
`RecipientType` or `StaticValueEntity`/`StaticValueType`, grep for direct repository usage in
`common.mail`, `household`, and `distribution` before assuming your change is contained here.
