# ADR-0017: Web Push (VAPID) as a second, out-of-app notification channel

**Status:** accepted · **Recorded:** 2026-08-09

## Context

SSE ([ADR-0005](0005-server-sent-events-with-a-transactional-outbox.md)) solves live updates for a
tab that is **open right now**. It cannot reach anyone whose browser is closed, whose phone is in a
pocket, or who is not looking at the app.

Some events need exactly that reach: a distribution has started, a distribution was closed, a
distribution is still open long after it should have been, a report mail failed to send, a user
account got locked out. These go to specific people who are not necessarily sitting in front of the
application — and they are the events where finding out an hour later is the problem.

## Decision

**The `push` module implements Web Push directly against the browsers' push services, signed with a
VAPID keypair.** It is a distinct channel with its own subscriptions, preferences and delivery
semantics — not a replacement for SSE.

- A device registers a push subscription (endpoint plus keys); the upsert-by-endpoint is serialized
  by the `REGISTER_PUSH_SUBSCRIPTION` advisory lock, since a check-then-act would otherwise let two
  overlapping registrations collide on the endpoint's unique constraint.
- Notification types are opt-in per user (`PushPreferencesService`), and targeting decides who is
  eligible for which type.
- `WebPushSenderService` sends one VAPID-signed message per subscription, **one attempt, no retry**.
  Its result is explicit: `SENT`, `EXPIRED`, `NOT_CONFIGURED` or `FAILED`.
  - `EXPIRED` covers both "the push service says this subscription is gone" (404/410) and "our VAPID
    key no longer matches the one it was created with" (403). Neither can succeed on retry without
    the user re-subscribing, so the subscription is deleted rather than retried forever.
  - `NOT_CONFIGURED` is deliberately distinct from `FAILED`: it is a deployment gap, and the one
    failure a user can be told something actionable about.
- Broadcasts are triggered by the same domain events the rest of the system already publishes
  (distribution started/closed, report-mail failure, user lockout), plus a scheduled
  still-open reminder.
- The fan-out listener is `@Async`. It performs one blocking HTTPS send per subscribed device — up
  to ~40s each against an unreachable push service — so a synchronous listener would hold the
  triggering request open for the sum of them.
- The VAPID keypair is supplied only through the mounted production config and is **not**
  hot-reloadable: it is consumed when its bean is built ([ADR-0011](0011-configuration-hot-reload-instead-of-restarts.md)).

## Consequences

- Notifications reach people who are not in the app, which is the entire point and something SSE
  structurally cannot do.
- **Two channels now exist for overlapping events.** A distribution start pushes over SSE *and* over
  Web Push, to different audiences with different guarantees. Anyone adding an event has to decide
  which channel(s) it belongs on rather than defaulting to both.
- Delivery is best-effort and asynchronous. There is no retry, no ordering guarantee and no read
  receipt; a push that fails is logged and dropped. That is appropriate for "heads up" messages and
  wrong for anything the system's correctness depends on — nothing may treat a push as delivered.
- Dead subscriptions are pruned automatically by the `EXPIRED` path, so the subscription table does
  not grow into a list of endpoints that can never receive anything again.
- Rotating the VAPID keypair invalidates every existing subscription (all of them start returning
  403 → `EXPIRED`) and requires a restart to take effect. Both facts have to be known before rotating.
- Implementing Web Push directly means owning the encryption, the JWT signing and the push-service
  response semantics — `WebPushEncryptionService`, `VapidSigner`, `WebPushEcKeys`. That code is not
  business logic, and it is this project's to keep correct.

## Alternatives considered

**SSE only.** Rejected: it cannot reach a closed tab, which is precisely the case these notifications
exist for.

**Email or SMS for the same events.** Email is already used for the post-distribution reports
([ADR-0009](0009-server-side-document-generation-with-xsl-fo.md)), but rejected as the alert channel:
too slow and too easily buried for "the distribution has started". SMS would add a paid external
provider.

**Firebase Cloud Messaging (or another push SaaS).** Rejected: it puts a third-party service and its
account management between this application and its users' devices, for a protocol that browsers
support natively via VAPID.

**An off-the-shelf Web Push library.** A reasonable option that was not taken; the encryption and
signing are implemented in-module. The cost of that choice is noted above.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/push/`
- `TafelAdminProperties.TafelAdminPushProperties` — VAPID key format and generation
- `database/common/lock/AdvisoryLockKey.REGISTER_PUSH_SUBSCRIPTION`
</content>
