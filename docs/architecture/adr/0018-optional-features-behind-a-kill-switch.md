# ADR-0018: Optional per-deployment features gated by one availability rule

**Status:** accepted · **Recorded:** 2026-08-09

## Context

Some capabilities depend on infrastructure that not every deployment has. The scanner folder is the
worked example: a NAS share that a physical document scanner writes to, offered as a second source
when attaching documents to a household. A deployment without that share must not show the feature
at all — an option that produces an error when clicked is worse than an absent one.

Two things can independently make such a feature unavailable: the infrastructure is not configured,
or an operator wants it switched off even though it is configured (during a NAS outage, say). Both
have to be expressible, and the frontend has to agree with the backend about the result — a UI that
offers a source the backend will refuse to serve is a bug report waiting to happen.

## Decision

**A single derived property is the one rule both sides go by, and it combines "is it configured"
with "is it switched on".**

```kotlin
val scannerFolderAvailable: Boolean
    get() = features.scannerFolderEnabled && !storage.scannerPath.isNullOrBlank()
```

- `tafeladmin.storage.scannerPath` is the wiring — where the share is mounted. It stays null unless
  explicitly set, which is what makes "not configured" the default.
- `tafeladmin.features.scannerFolderEnabled` is the kill switch — an operator's on/off, independent
  of whether the path exists.
- The derived `scannerFolderAvailable` is what code asks. It is enforced server-side by
  `ScannerFileService`, so the backend refuses regardless of what any client believes.
- The same value is reported to the frontend as `/api/config`'s `scannerFolderEnabled`, so the UI can
  hide what the backend would refuse.
- Both settings are editable on a running deployment, and the flag takes effect without a restart
  because its consumers re-read it per use ([ADR-0011](0011-configuration-hot-reload-instead-of-restarts.md)).
  A change is pushed to open clients over `/api/sse/config`.
- This lives in the `config` module, which is operator-managed deployment configuration only.
  Anything a *user* can change at runtime belongs in `settings` and lives in the database.

## Consequences

- There is exactly one answer to "is this feature available", and both sides read it. The UI cannot
  drift from what the backend permits.
- The kill switch is usable during an incident: an operator can turn the feature off on a live
  instance, and open sessions update, without a restart and without touching the mount.
- **Server-side enforcement is not optional.** The `/api/config` flag is a UX affordance; hiding a
  button is not access control, and `ScannerFileService` is what actually refuses.
- Every such feature costs a config property, a derived rule, a `ConfigResponse` field, a frontend
  subscription and — because the flag can change at runtime — components that *observe* config
  rather than reading it once.
- The pattern only works for features whose consumers re-read the property. A capability baked into
  a bean at construction cannot be toggled this way and needs a restart, whatever it is called.
- The flag set is deployment-wide, not per-user and not percentage-based. This is a "does this
  environment have it" switch, not an experimentation framework.

## Alternatives considered

**Infer availability from configuration alone** (feature on iff `scannerPath` is set). Rejected: it
leaves no way to switch the feature off without unmounting or unconfiguring it, which is exactly what
an operator needs during an outage.

**A boolean flag alone, with no configured-path check.** Rejected symmetrically: an enabled flag with
no share configured produces a feature that fails at first use.

**Two independent checks duplicated on each side.** Rejected: two places to keep in sync, and the
frontend copy would inevitably diverge. One derived property has one answer.

**A feature-flag service or database-backed flags.** Rejected: this is operator/deployment
configuration, and it already has a home — the mounted `config.yml` and its reload mechanism. A
database flag would be user-changeable state, which is what the `settings` module is for.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/config/properties/TafelAdminProperties.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/config/README.md`
- `modules/household/internal/document/` — `ScannerFileService` and the documents tab
- `CLAUDE.md` — "Scanner Folder"
</content>
