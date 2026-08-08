# ADR-0027: One locale and one timezone, fixed at the image level

**Status:** accepted · **Recorded:** 2026-08-09

## Context

This system serves one food bank in Vienna. Its users are German-speaking, its currency is the Euro,
its dates are read and written in German conventions, and its central domain event — the Saturday
distribution — happens on Vienna wall-clock time.

Internationalisation is therefore not a requirement, but *consistency* very much is: date and number
handling that varies with the host's default locale produces bugs that only appear on one machine, and
"Saturday" has to mean the same day to the deploy freeze, the scheduled jobs and the people in the
hall.

## Decision

**German/Austrian conventions and `Europe/Vienna` are fixed in the runtime, not negotiated per
request.**

- The container entrypoint sets `-Duser.timezone=Europe/Vienna -Duser.language=de -Duser.country=DE`,
  so the JVM's defaults are the same everywhere the image runs, regardless of host settings.
- The frontend registers the `de-DE` locale and sets `LOCALE_ID` and `DEFAULT_CURRENCY_CODE`
  accordingly; user-facing text is German, written directly in the templates rather than through an
  i18n layer.
- CSV exports use `;` as the delimiter, matching what Austrian/German Excel expects
  ([ADR-0009](0009-server-side-document-generation-with-xsl-fo.md)).
- The Saturday deploy freeze evaluates the weekday with `TZ=Europe/Vienna` explicitly, rather than
  relying on the CI runner's clock ([ADR-0013](0013-saturday-production-deploy-freeze.md)).
- Where a value must **not** be locale-formatted, that is stated explicitly at the call site: the
  statistics query formats with `Locale.ROOT` because the result round-trips through
  `String.toDouble()`, which is locale-independent and would throw on a comma decimal separator.

## Consequences

- Dates, numbers and currency render the same in the app, in PDFs, in CSVs and in mails, on any host.
- The most common category of locale bug — behaviour that depends on the machine's default and
  therefore differs between a developer's laptop, CI and production — is removed at the source.
- "Saturday" is unambiguous across the deploy freeze, scheduled jobs and the domain.
- **Adding a second language later is a real project, not a configuration change.** German strings
  are in the templates; there is no message-bundle layer to fill in. That cost is accepted knowingly
  because the alternative is paying an i18n tax on every screen for a user base that is entirely
  German-speaking.
- Anything that must be locale-neutral has to say so. The default is now German, so a machine-read
  number formatted "normally" will carry a comma — the `Locale.ROOT` case above is the worked example
  of getting this wrong being possible.
- Daylight saving is handled by the zone, not by offsets, which is why the zone is set rather than a
  fixed `+01:00`.

## Alternatives considered

**Full i18n from the start** (message bundles, locale negotiation, per-user timezone). Rejected:
every screen, PDF template and mail would pay for a capability with no user.

**Store and compute in UTC, convert at the edges.** The usual advice for multi-region systems, and
rejected here: it adds a conversion at every boundary — including PDF rendering and CSV export —
for a single-site deployment where the wall clock *is* the domain.

**Leave the JVM at the host's defaults.** Rejected: it makes behaviour depend on where the container
happens to run, which is precisely the non-reproducibility this decision removes.

## References

- `_build/Dockerfile` — the entrypoint's `-Duser.*` flags
- `frontend/src/main/webapp/src/main.ts`, `src/app/app.config.ts`
- `modules/reporting/internal/StatisticsService.kt` — the explicit `Locale.ROOT` call
- `common/csv/CsvUtil.kt`
</content>
