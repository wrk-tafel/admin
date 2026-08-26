# ADR-0021: Household documents live on a mounted volume, their metadata in the database

**Status:** accepted · **Recorded:** 2026-08-09

## Context

A household's documents tab holds scans and uploads — income statements, registration papers,
identity documents. They arrive from two sources: a browser upload, and the optional scanner folder
that a physical document scanner writes to ([ADR-0018](0018-optional-features-behind-a-kill-switch.md)).

These files are larger than anything else in the system, they are written once and read rarely, and
they are the most sensitive data it holds. The filenames come from untrusted places — a browser's
file picker or a NAS share — and the container already has a volume layout for exactly this kind of
state (`/app/documents`).

## Decision

**File bytes go to the filesystem under a configured path; the database holds one metadata row per
document, including the storage path.**

- `DocumentStorageService` owns the filesystem side and nothing else: it writes to
  `<documentsPath>/<householdId>/<uuid>_<sanitized original name>` and returns the absolute path,
  which the metadata row stores.
- The stored name is prefixed with a random UUID, so two documents with the same original filename
  cannot collide.
- The original filename is **sanitized to its last path segment** before use, so an untrusted name
  cannot escape the household's directory.
- Uploads are size-limited before anything is written.
- Storage is a separate service from `HouseholdDocumentService` on purpose, so deleting a household
  can clean up its files without depending on the document business logic — **JPA cascade removes the
  rows, never the bytes**.
- `documentsPath` is configuration (`tafeladmin.storage.documentsPath`), and `/app/documents` is a
  declared volume in the image.

## Consequences

- The database stays small and its backups stay fast; large binaries never travel through JDBC or sit
  in the connection pool's memory.
- Serving a document is a file read, and the metadata row is queryable like any other entity.
- **The two halves can drift.** Files and rows are not one transaction: a crash between them, or any
  delete path that forgets the file, leaves an orphan on disk or a row pointing at nothing. That is
  the central cost of this decision and the reason a dedicated cleanup service exists alongside the
  storage service.
- **Backups must cover two things.** A database dump alone is not a backup of the documents, and a
  volume snapshot alone is not a backup of what they belong to. Restoring one without the other
  produces exactly the drift above.
- Absolute paths are stored in the rows, so moving the volume or changing `documentsPath` invalidates
  existing rows unless they are migrated too.
- The volume holds the most sensitive data in the system in plain files. Its access control and
  encryption are the host's responsibility, not the application's — and that has to be a conscious
  part of any deployment. The operator confirmed
  ([#3182](https://github.com/wrk-tafel/admin/issues/3182)) that the documents volume, the database
  volume and their backups are on encrypted storage at the infrastructure level.

## Alternatives considered

**Store the bytes in the database (`bytea`/large objects).** The option that makes writes atomic and
backups singular, and it is the strongest alternative here. Rejected: it inflates the database and
every dump with data that is written once and read rarely, and it pushes large binaries through the
connection pool.

**Object storage (S3-compatible).** Rejected for the same reason as every other external component
([ADR-0003](0003-postgresql-as-the-only-infrastructure-dependency.md)): a service to run, credential
management, and a network dependency in the read path, for a single-host deployment that already has
a volume.

**Keep the original filename as-is on disk.** Rejected: collisions between two households' identically
named files, and a path-traversal surface from a name the application does not control.

## References

- `modules/household/internal/document/DocumentStorageService.kt`,
  `HouseholdDocumentService.kt`, `DocumentStorageCleanupService.kt`
- `TafelAdminProperties.TafelAdminStorageProperties`
- `_build/Dockerfile` — the `/app/documents` volume
</content>
