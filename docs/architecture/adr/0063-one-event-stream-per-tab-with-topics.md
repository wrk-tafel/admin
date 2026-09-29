# ADR-0063: One event stream per browser tab, made of topics

**Status:** accepted · **Recorded:** 2026-09-29

## Context

[ADR-0005](0005-server-sent-events-with-a-transactional-outbox.md) put every live screen on its own
Server-Sent Events endpoint: `/api/sse/distributions`, `/config`, `/dashboard`, the ticket monitor,
the scanner results and the scanner-file list. A tab therefore held two or three streams at once -
`distributions` and `config` for the whole session, plus whatever the open screen added - and each
was a long-lived request with its own emitter, outbox callbacks, heartbeat and reconnect handling.
Features that wanted a small live signal on top of that either paid for another stream or rode on an
existing one by convention (the registered-customer count on `distributions`, the bell's change
signal). Production is served over HTTP/2, so the browser's per-host connection limit is not the
concern; the server-side cost per tab and the question "which stream carries what" are.

## Decision

A tab holds exactly one stream: `GET /api/sse/events?topics=a,b:arg`
(`common/sse/SseEventsController.kt`).

- **Topics are beans.** Each kind of event is an `SseTopic` (`common/sse/SseTopic.kt`) implemented by
  the module that owns the data: `distribution`, `config`, `notifications`, `dashboard`,
  `ticket-screen`, `scanner-results:<scannerId>`, `scanner-files`. `common` collects them; it depends
  on none of the modules. A topic sends its initial state, if it has one, and forwards outbox events
  as SSE events named after itself.
- **The URL is the subscription.** The server remembers nothing about a stream, so any application
  instance can serve any tab. A missing authority for one requested topic is a 403 for the whole
  stream (`SseTopic.requiredAuthorities` replaces the per-endpoint `@PreAuthorize`).
- **The frontend keeps one `EventSource`** (`common/sse/sse.service.ts`). Screens ask for topics with
  `SseService.topic(name, {argument, connectionStateCallback})`; the service opens the stream for the
  union of what is subscribed and replaces it when that set changes (in the next microtask, so
  subscriptions made together cost one reconnect). Reconnect backoff, the disconnect grace period and
  the parse-failure logging rules are unchanged, and the connection state is shared by all
  subscribers.
- The old per-resource endpoints are removed.

## Consequences

- One long-lived request per tab instead of two to four; adding a live signal is a new `SseTopic`
  bean, not a new endpoint or a convention on someone else's stream.
- Entering or leaving a screen with a topic of its own replaces the connection. The window in which a
  message can be missed is a few milliseconds and is covered by the outbox replay for every topic
  except `scanner-results`, which is deliberately not replayable (a scan result is an instruction, not
  state) - a scan in that window has to be scanned again. Initial snapshots (`distribution`,
  `dashboard`, `ticket-screen`) are sent again on every replacement; their consumers already treat a
  repeated snapshot as a no-op.
- A tab that is open across a deployment which removes the old endpoints reconnects to a topic set the
  new server understands only after a reload of the app; the old frontend keeps retrying a 404 with
  backoff until then.
- The stream's failure modes are shared: a bad topic argument or a missing authority now refuses the
  whole stream rather than one screen's.

## Alternatives considered

- **Keep separate endpoints, add signals by piggybacking.** What the bell did before this record.
  Works, but every addition blurs what a stream carries, and connections per tab stay at two to four.
- **Subscribe and unsubscribe by request against an open stream.** Avoids replacing the connection
  when the topic set changes, but needs a server-side registry from stream to emitter, which a second
  application instance cannot see - stateless topics in the URL were preferred over sticky routing.
- **WebSockets.** Bidirectional, which nothing here needs; SSE plus the outbox already covers
  reconnect and replay.

## References

- Issue #3770, PR #3767 (the bell signal that first shared a stream)
- [ADR-0005](0005-server-sent-events-with-a-transactional-outbox.md) - the outbox that feeds every topic
