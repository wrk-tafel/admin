# ADR-0008: Explicit REST conventions and Request/Response/Item DTO naming

**Status:** accepted · **Recorded:** 2026-08-09

## Context

The API is internal — one backend, one frontend, versioned and deployed together
([ADR-0002](0002-single-deployable-image-with-independent-builds.md)). That removes the usual
pressure for formal versioning, but it also removes the natural discipline: with no external
consumer to break, each endpoint tends to be shaped however was convenient at the time.

Two habits in particular caused friction. First, reusing one domain class for both the request body
and the response of a resource: the two directions then cannot evolve independently, and adding a
write-only or read-only field means adding a nullable field visible to both. Second, inconsistent
status codes and paths, which forces a reader to open the controller to learn what an endpoint
returns.

The frontend also holds several long-lived SSE streams whose URLs must stay stable
([ADR-0005](0005-server-sent-events-with-a-transactional-outbox.md)).

## Decision

**Endpoint conventions are project-wide rules, and every type appearing in a controller signature
carries one of exactly three suffixes.**

REST conventions:

- All endpoints live under `/api/`.
- Update-by-id uses `PUT`; create returns `201`; delete returns `204`.
- SSE endpoints for a resource live in a sibling `...Sse...` controller under `/api/sse/...`, so
  their URLs do not move when the REST resource's base path changes.

DTO naming — decided by how the type is *used*, not by how it reads:

1. **`Request`** — the type is bound to `@RequestBody` somewhere. If an identical type is also
   returned, it is split into a same-named `XxxRequest`/`XxxResponse` pair (`CarRequest`/
   `CarResponse`, `HouseholdRequest`/`HouseholdResponse`), even when the two are field-for-field
   identical on day one.
2. **`Response`** — returned directly from an endpoint and never a request body
   (`EmployeeResponse`, `StatisticsResponse`, `DistributionCloseResponse`).
3. **`Item`** — only ever the element type of a `PagedResponse<T>` or an `XxxListResponse`'s list
   (`RouteItem`, `SchoolStarterPackageItem`). A type that is also created via `POST` keeps `Item`
   (`HouseholdNoteItem`) — the test is "is it ever a request body", not "is one ever returned".

`PagedResponse<T>` and the per-resource `XxxListResponse` wrappers are exempt and keep their names.
Nested value objects that never appear in a controller signature keep their plain domain name
(`Person`, `HouseholdAddress`, `HouseholdIssuer`); enums never take a suffix. `Model` /
`ResponseModel` remain fine as *file* names for a group of DTOs (`HouseholdResponseModel.kt`).

Where a service needs data that is structurally identical across a `Request`/`Response` split, it
takes the narrower shared shape (`List<Person>`, not `Household`) rather than gaining an overload or
a shared supertype.

## Consequences

- The name of a type states its direction, so a reader knows from the signature alone whether a
  field is client-supplied. That is the whole return on the convention.
- The write and read contracts of a resource can diverge without dragging each other along — the
  reason the split is applied even when it produces two identical classes.
- **It produces deliberate duplication.** Two identical classes, and two converter directions, for
  resources whose contracts have not yet diverged. Accepted knowingly.
- The rules are usage-driven, which means a type's correct suffix can change when an endpoint is
  added — a `Response` that later becomes a request body has to be split, and that rename ripples
  through its converters.
- `_http-calls/*.http` files are the fastest way to see actual request/response shapes and are kept
  as the first reference before reading controller source, though they do not cover every endpoint.

## Alternatives considered

**One domain type per resource for both directions.** The prior habit. Rejected: it couples the two
contracts permanently and pushes optional/ignored fields onto both sides.

**Generated DTOs / a shared schema (OpenAPI codegen) for the frontend.** Rejected for now: it adds a
generation step and a schema artifact to a two-party, same-repo API where the compiler on one side
and typed `HttpClient` interfaces on the other already catch most drift.

**Suffix by intuition ("this one feels like a request").** Rejected: it is exactly what produced the
inconsistency. A mechanical test — is it bound to `@RequestBody`? is it only a list element? — gives
the same answer for every reviewer.

**Explicit API versioning (`/api/v1/...`).** Rejected: client and server ship in the same image;
there is never a version of one running against a different version of the other.

## References

- `CLAUDE.md` — "API Structure" and "REST DTO naming convention"
- `_http-calls/`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/common/api/PagedResponse.kt`
- `HouseholdService.validate` / `mapToValidationPersons` — the shared-shape rule in practice
</content>
