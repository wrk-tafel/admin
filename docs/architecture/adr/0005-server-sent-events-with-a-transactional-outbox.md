# ADR-0005: Real-time updates via Server-Sent Events fed by a transactional outbox

**Status:** accepted · **Recorded:** 2026-08-09

## Context

Several screens have to reflect state that someone *else* changed, within seconds and without a
refresh: the dashboard's distribution state, the fullscreen ticket display in the distribution hall,
the scanner check-in results, and the deployment config
([ADR-0011](0011-configuration-hot-reload-instead-of-restarts.md)).

All of these are one-way: the server tells the browser something changed. Nothing needs a client to
push over the same channel — user actions are ordinary REST calls. Notifications also have to reach
*every* connected client, not just the one whose request caused the change, so publishing from
inside the request thread to that thread's own emitter is not enough.

The hard part is the coupling between "the change is committed" and "the notification went out". A
notification sent before commit describes a state no other transaction can see yet; one sent after a
rollback describes a state that never existed.

## Decision

**Server-Sent Events for the transport, and a `sse_outbox` table plus Postgres `LISTEN`/`NOTIFY` for
the fan-out.**

1. A mutation calls `SseOutboxService.saveOutboxEntry(notificationName, payload)`, which writes a row
   to `sse_outbox` **in the same transaction as the change itself** and fires `pg_notify` on the
   `sse_outbox` channel.
2. `SseOutboxListenerService` holds one dedicated JDBC connection running `LISTEN sse_outbox;` and
   dispatches each incoming notification to the callbacks registered for that name. If that
   connection drops it reconnects and replays the outbox rows written in the meantime.
3. Every open `SseEmitter` — one per browser tab or ticket screen — registers a callback via
   `forwardNotificationEventsToSse(...)`, optionally filtered (the scanner stream filters by
   `scannerId`).
4. Because the outbox only forwards *future* notifications, a newly connected client is first sent
   an out-of-band snapshot of current state directly, before its callback is registered.
5. `sse_outbox` rows are pruned by a scheduled cleanup.

Consequences of the replay in step 2 shape the event design: **an event carries a full snapshot of
current state, so receiving it twice is harmless**. A stream whose events *do* something instead of
describing something has to opt out explicitly (`replayable = false`, as the scanner-results stream
does).

## Consequences

- The notification cannot outlive a rolled-back change or precede its commit — the outbox row and
  the change share a transaction. This is the whole point of the pattern and the reason it is worth
  the extra table.
- Fan-out is not tied to the request thread: any listener in the process (and, if there were ever
  more than one instance, any instance) sees the notification.
- Delivery is at-least-once by design. Every consumer must tolerate duplicates, which is enforced in
  practice by making payloads snapshots rather than deltas. Getting this wrong on a new stream is
  the most likely way to misuse the mechanism.
- SSE is one-directional and rides on plain HTTP — no protocol upgrade, no extra port, and it works
  through the reverse proxy with `proxy_buffering off` (documented in the root `README.md`, together
  with the nginx `add_header`-inside-`if` trap that silently drops the SSE cache header).
- **Streams cost browser connections.** Production is HTTP/1.1, where a browser allows ~6 concurrent
  connections per origin, and the app holds three permanent streams. A leaked or duplicated stream is
  not a slow page — it is a page that cannot issue requests at all.
- The `LISTEN` connection is deliberately fragile-by-omission: nothing else may close it, and
  `SseOutboxListenerService.cleanup()` only cancels its job rather than waiting for its blocked
  reader. Closing it from another thread hung CI for tens of minutes
  ([#2985](https://github.com/wrk-tafel/admin/issues/2985)), and a config refresh must not re-create
  the bean — locked down by `ConfigRefreshSideEffectsIT`.

## Alternatives considered

**WebSockets.** Rejected: bidirectional framing, a separate protocol upgrade to get through the
proxy, and its own reconnect/heartbeat handling — all for a use case where the client never sends
anything over the channel.

**Polling.** Rejected: the ticket screen and check-in flow need sub-second latency in front of a
queue of people; polling fast enough to feel live wastes far more requests than the streams cost.

**Publishing directly to emitters from the mutating service, without an outbox.** Rejected: it puts
the notification before the commit (or wraps it in transaction-synchronization callbacks that still
lose the event on process death) and only reaches emitters held by that same process.

**A message broker.** Rejected — see [ADR-0003](0003-postgresql-as-the-only-infrastructure-dependency.md).

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/database/common/sseoutbox/`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/distribution/README.md` — "Real-time
  updates: outbox pattern, not raw pub/sub"
- `README.md` — nginx configuration for SSE
- [#2985](https://github.com/wrk-tafel/admin/issues/2985) — the `LISTEN` connection's lifecycle
</content>
