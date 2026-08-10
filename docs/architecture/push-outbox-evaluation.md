# An outbox for push notifications — evaluation

Analysis for [issue #3155](https://github.com/wrk-tafel/admin/issues/3155). It asks whether the
`push` module should send through a database outbox, the way mails do since
[ADR-0041](adr/0041-mails-sent-through-an-outbox.md) and SSE events do via `sse_outbox`. This is an
evaluation, not a decision record — nothing here is decided, and acting on any of it needs its own
ticket.

**Recommendation up front: no push outbox.** Two of the three problems ADR-0041 solved for mail do
not exist for push, the third is already solved by the Web Push protocol itself, and the one real
defect the analysis did turn up — a notification that can go out for a transaction that then rolls
back — is fixed by an annotation, not by a queue. [§5](#5-what-to-do-instead) lists what is worth
doing instead.

## 1. What the push path does today

One entry point, `PushBroadcastService.broadcast(type, title, body)`. It walks every row of
`push_subscriptions`, drops the ones whose owner is not an audience for that type
(`PushNotificationTypeTargeting`, permissions) or has switched it off (`PushPreferencesService`),
and then does **one blocking HTTPS POST per remaining device** through `WebPushSenderService`
(10 s connect, 30 s read). Each send is signed freshly by `VapidSigner` and encrypted for that one
subscription by `WebPushEncryptionService`.

One attempt per device, no retry, four outcomes:

| Outcome | What happens |
|---|---|
| `SENT` | nothing further |
| `EXPIRED` (403/404/410) | the subscription row is deleted |
| `NOT_CONFIGURED` | no VAPID keypair — nothing was attempted |
| `FAILED` | one `logger.warn` per subscription, and that is the end of it |

Eleven things trigger a broadcast: `DistributionStartedEvent`, `DistributionClosedEvent`, the four
phase events (`CheckinStartedEvent`, `FoodHandoutStartedEvent`, `AllTicketsProcessedEvent`,
`FoodCollectionCompletedEvent`), `RouteAtLastStopEvent`, `UserLockedOutEvent`,
`ReportMailFailedEvent`, `MailDeliveryFailedEvent`, and the scheduled
`DistributionStillOpenReminderService`. Plus `PushBroadcastService.sendTo`, the per-device test
notification, which is not a broadcast at all.

Every listener is `@Async` except `DistributionClosedPushListener`, which is already reached from
`distribution`'s async post-processing chain. **No request thread waits on the fan-out today.**

## 2. Measuring push against ADR-0041's three failures

ADR-0041 named three concrete failures of sending mail inline. They are the right yardstick, and
push scores differently on all three.

### "A slow server makes the application slow" — already solved, without an outbox

This was mail's headline problem: closing a distribution waited for SMTP. Push never had it. The
listeners are `@Async` precisely because a broadcast blocks per device, and the KDoc on
`DistributionStartedPushListener` and `RouteAtLastStopPushListener` says so in as many words. An
outbox would replace one non-blocking mechanism with another and change nothing a user can perceive.

### "An unreachable server loses the message" — mostly solved by the protocol

This is the point where push and mail differ most, and it is what settles the question.

**Web Push is already a store-and-forward queue.** The application does not deliver to a device; it
delivers to the browser vendor's push service (FCM, Mozilla autopush, Apple's Web Push gateway).
Once that service accepts the POST, *it* holds the message for an offline device and delivers it
when the device comes back — for up to `tafeladmin.pushDelivery.ttl`, 12 hours here, deliberately
about the span of a distribution day. The overwhelmingly common failure — a phone asleep, out of
signal, or switched off — is therefore already covered, and an outbox would add nothing to it.

What an outbox *would* cover is the narrow remainder: our POST to the push service itself failed
(its 5xx, a timeout, our network), or the process died between the event and the send. That is a
push-service outage or a restart in the same second.

Even in that remainder, a retry only helps if it lands while the message still means something.
"Ausgabe gestartet", "Route beim letzten Stopp", "Alle Kunden abgearbeitet" are worth nothing an
hour later — the 12-hour TTL already *is* the statement that these expire, and the one notification
with a longer useful life, the still-open-distribution reminder, repeats every morning by design
until someone closes the distribution. Its retry already exists and is better than a queue's.

### "A rolled-back transaction could still have sent" — real, and the one genuine defect

Here push is *worse* off than mail, and this is what the analysis actually turned up.

Five of the eleven triggers publish their event from **inside an open transaction**, and are
consumed by an `@Async` listener that runs on another thread:

| Event | Published from |
|---|---|
| `CheckinStartedEvent` | `DistributionService.saveHousehold` |
| `FoodHandoutStartedEvent` | `DistributionService.closeCurrentTicket` |
| `AllTicketsProcessedEvent` | `DistributionService.closeCurrentTicket` |
| `RouteAtLastStopEvent` | `RouteGuidanceService.publishIfAtLastStop` |
| `UserLockedOutEvent` | `LoginAttemptService.recordFailure` |

(`DistributionStartedEvent` and `DistributionEndedEvent` are not in this list: `DistributionService`
commits them through a `REQUIRES_NEW` template and publishes afterwards, explicitly for this reason.)

So the notification can leave the building before — or instead of — the commit. If that transaction
rolls back, two things go wrong at once: a device has been told about a check-in, a hand-out or a
last stop that did not happen, and the "already notified" guard that would have suppressed a repeat
(`markCheckinStarted`, `markFoodHandoutStarted`, `markTicketsCompleted`, `markLastStopNotified`)
rolls back with it — so the same notification can fire a second time later. `LoginAttemptService`
documents the trade and accepts it deliberately for the lockout case; the other four do not mention
it.

An outbox would fix this, because the row commits with the work. But so does
`@TransactionalEventListener(phase = AFTER_COMMIT)` on the listener, at a cost of one annotation.
See [§5](#5-what-to-do-instead).

## 3. What an outbox would cost here

Mail's outbox is cheap because a mail is one finished artefact for one recipient list. A push
broadcast is neither.

**Fan-out means partial success is the normal case.** One notification is N HTTPS sends with N
independent outcomes; three devices can succeed while a fourth times out. A single row per
notification cannot express that, so the table has to be one row per *(notification × subscription)*
— with a foreign key to a subscription the send path itself deletes when the push service reports it
gone, and rows for subscriptions that no longer exist by the time the poller reaches them. The
alternative, one row per notification carrying the still-pending subscription ids, reintroduces the
partial-failure bookkeeping inside the row.

**The row cannot store the finished message.** This is the property that makes the mail outbox
robust: `mail_outbox.message` holds the exact MIME bytes the server will get, so it cannot drift
from the code that composed it. Push has no such artefact. The body is `aes128gcm`-encrypted against
*that one subscription's* `p256dh`/`auth` keys, and the `Authorization` header is a VAPID JWT scoped
to that endpoint's origin with a 12-hour expiry. A queued row must therefore store the *plaintext*
payload and re-encrypt and re-sign at send time — which is fine, but it means an outbox buys none of
the "what is queued is exactly what will be sent" guarantee it buys for mail.

**Two more decisions the queue forces open.** Whether the permission and preference check happens at
enqueue time or at send time (a user who switches a type off in between should probably not get it,
which argues for send time, which in turn means the row must carry the type and not just the text).
And what the poller does with a subscription that the send just pruned as expired.

**And the code itself.** Mirroring mail's shape means a migration plus its sequence, an entity, a
repository, a poller with backoff and retention, five or six configuration properties, and the tests
for all of it — for a mechanism whose realistic benefit is §2's narrow remainder.

## 4. The direction an outbox would make things worse

Delivery through a queue is at-least-once. A crash between "sent to device 3 of 7" and the row
update re-sends to the devices already reached on the next poll.

Normally that is what a de-duplication key is for, and Web Push has one: the RFC 8030 `Topic`
header, which replaces an undelivered message of the same topic instead of stacking another one
behind it. **This application deliberately does not send it** — FCM maps it onto its own collapse
key, and collapsible messages are rate-limited per app, device and collapse key (a burst of about
20, refilling at one every three minutes, with the excess silently dropped). Every notification here
would fall into one of a handful of topics, so repeated sends would stop arriving altogether. The
reasoning is written down in `WebPushSenderService.send`.

So there is no de-duplication lever available, and an outbox would trade "occasionally lost" for
"occasionally duplicated". For a notification that is the worse direction: a duplicate is visible to
every recipient and reads as a broken app, while a miss is invisible and, for these messages, mostly
harmless.

## 5. What to do instead

Three things, in descending order of value. None of them needs a table.

1. **Publish after commit** for the five events in [§2](#a-rolled-back-transaction-could-still-have-sent--real-and-the-one-genuine-defect).
   Either publish outside the transaction the way `DistributionService` already does for
   started/ended, or make the push listeners `@TransactionalEventListener(phase = AFTER_COMMIT)`.
   Note `fallbackExecution = true` matters if the second route is taken: without it a listener is
   silently skipped when there is no transaction at all, which is precisely the concern
   `LoginAttemptService`'s comment raises about the lockout event. This is the only correctness
   defect found, and it is a small change.
2. **Make a failed broadcast visible as a broadcast.** Today a failure is one `logger.warn` per
   subscription and nothing above it, so "the push service was down for ten minutes" and "one phone
   is unreachable" look the same in the log. One summary line per broadcast — type, and the
   sent/failed/expired counts — makes an outage greppable. This is the part of ADR-0041's "a mail
   nobody received is a row somebody can find" that is worth carrying over, and it costs a log
   statement rather than a queue.
3. **Optionally, one immediate in-call retry** for a transient failure (5xx or timeout, not 403/404/410,
   which are final by definition). It covers the realistic transient case, keeps the message inside
   the window where it still means something, and adds no state. Worth having only if the summary
   logging from (2) shows transient failures actually occurring — measure first.

## 6. When this should be revisited

The conclusion rests on facts that could change:

- **A second application instance.** Not planned ([ADR-0019](adr/0019-supply-chain-and-container-runtime-hardening.md)),
  and it would need a `FOR UPDATE SKIP LOCKED` claim for the mail outbox too — but a queue is the
  natural place to put that coordination once it exists.
- **A notification that must not be lost.** Everything sent today is an announcement that expires
  with the distribution day. A notification that carries an obligation — an approval someone has to
  act on, a warning that must reach an administrator — is a different class of message, and would
  justify durability for that message rather than for the mechanism.
- **A materially larger subscriber base.** The fan-out is a serial loop over every subscription. Long
  before an outbox becomes the answer to that, parallel sends within one broadcast would be.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/push/internal/PushBroadcastService.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/push/internal/WebPushSenderService.kt` — the `Topic`-header reasoning
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/config/properties/TafelAdminProperties.kt` — `TafelAdminPushDeliveryProperties` (TTL, urgency)
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/database/common/mailoutbox/MailOutboxService.kt` — the pattern being compared against
- [ADR-0041](adr/0041-mails-sent-through-an-outbox.md), [ADR-0001](adr/0001-modular-monolith-with-spring-modulith.md)
