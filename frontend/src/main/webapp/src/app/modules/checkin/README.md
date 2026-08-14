# Checkin Module

This module implements customer check-in during a distribution: registering physical QR scanners, reading the scans, looking up the scanned customer, assigning a ticket number, and driving the customer-facing "ticket monitor" screen.

It's mounted at `/anmeldung` (`checkin.routes.ts`) and gated in `app.routes.ts` with `data: { anyPermissionOf: ['SCANNER', 'CHECKIN'] }` — note this is **two** permissions, not one, because the module serves two different physical roles (see below).

## Components

```
modules/checkin/
  ├── services/qrcode-reader/qrcode-reader.service.ts   # wraps @zxing/browser, decodes QR from a <video> element
  ├── views/scanner/scanner.component.ts                # kiosk screen: registers a scanner device, decodes QR codes
  ├── views/checkin/checkin.component.ts                 # staff screen: "Kunden-Annahme", assigns ticket numbers
  ├── views/ticket-screen-control/...                     # staff screen: drives the customer-facing monitor
  ├── views/ticket-screen-fullscreen/...                  # thin wrapper mounted at the standalone monitor route
  └── components/ticket-screen/ticket-screen.component.ts # the actual monitor display, reused by both views above
```

### QRCodeReaderService

This module uses `@zxing/browser`'s `BrowserQRCodeReader` for QR decoding — check `package.json` (`@zxing/browser`, `@zxing/library`) and `qrcode-reader.service.ts` if in doubt.

The service is a thin wrapper: `getCameras()` lists video devices, `init(elementId, successCallback)` remembers which `<video>` element and callback to use, and `start(cameraId)` / `restart(cameraId)` / `stop()` manage the actual `decodeFromVideoDevice` call. The last-used camera id is persisted to `localStorage` under `TAFEL_LAST_CAMERA_ID` so a kiosk reopening the page reuses the same camera. Without a saved id, `getCurrentCamera` prefers a device whose `MediaDeviceInfo.label` looks rear-facing (`back`/`rear`/`environment`/`rück`, case-insensitive) over the first enumerated device — there is no cross-browser way to read `facingMode` before a stream is opened, so the label is what the heuristic has to work with. `isTorchSupported()` / `setTorch(on)` expose the active stream's torch (`controls.switchTorch`, set by `@zxing/browser` only when the current track's capabilities include one) for `ScannerComponent`'s torch toggle.

### ScannerComponent (`/anmeldung/scanner`) — the kiosk device

This is what runs on the physical scanning station (handheld scanner or webcam kiosk), typically a phone or tablet held by a runner. On load it does two things concurrently (`initEffect`):

1. **Registers itself** as a scanner: reads an existing scanner id from `localStorage['scanner-id']` if present and calls `ScannerApiService.registerScanner(existingScannerId)` (`POST /scanners/register`). The backend either confirms the existing id or issues a new one, which is written back to `localStorage`. Clearing that key (or using a different browser) gets you a *new* scanner id.
2. **Starts the camera**: lists cameras, picks the last-used/rear one (see `QRCodeReaderService` above), and starts decoding.

The screen serves two audiences in sequence, tracked by the `phase` signal (`'pairing' | 'scanning'`), driven by `hasStartedScanning` — a flag set once the camera first decodes successfully and never cleared again:
- **Pairing** (`phase() === 'pairing'`, before the camera has ever started): the scanner number is huge and centered — it gets read out loud across the room so the Annahme operator (`CheckinComponent` below) can pick it from their dropdown — with the camera picker underneath it.
- **Scanning** (`phase() === 'scanning'`, latched once the camera has started at least once): the video preview takes over the screen, the scanner number shrinks to a corner chip, and a torch toggle appears when `torchSupported()` is true. A later camera hiccup surfaces as the `connectionLost` overlay described below **on top of** the scanning layout — it deliberately does not bounce the runner back to the pairing screen they already read the number off of.

`connectionLost` (`hasStartedScanning() && (!readyState() || registrationFailed())`) covers both ways the kiosk can stop actually delivering scans: the camera stream failing, or `registerScanner()`'s `POST` failing (`registrationFailed` signal, set in its `catch`). Either shows a full-screen red "Verbindung getrennt" overlay — a small badge is easy to miss on a phone held at arm's length — with a retry button that calls `retryRegistration()`. It renders above the scan-feedback overlay below (`z-40` vs `z-30`): a scan flashing "success" while nothing could actually reach the backend would be misleading.

Decoded QR text is parsed as a plain number (`+decodedText`) — the QR payload is just the customer/household id, nothing more structured. Sending the scan result to the backend is **deliberately decoupled** from the decode callback:

```ts
// Scanner registration and camera startup happen concurrently, so a scan can be decoded
// before scannerId() resolves. Route through this effect (instead of sending directly from
// the callback) so it fires once scannerId becomes available too, instead of dropping the
// scan or posting to `/scanners/undefined/results`.
sendScanResultEffect = effect(() => {
  const scannerId = this.scannerId();
  const lastScanResult = this.lastScanResult();
  if (scannerId !== undefined && lastScanResult !== undefined) {
    this.scannerApiService.sendScanResult(scannerId, lastScanResult).subscribe();
  }
});
```
If you're debugging "scans get lost right after page load," this is the place to look.

A successful decode also drives `scanFeedback`, a full-screen confirmation (green "Gescannt" / amber "Bereits gescannt", the decoded number in large type, `navigator.vibrate`, and a short Web Audio beep) that auto-hides after `SCAN_FEEDBACK_DURATION_MS` (2s). Re-decoding the *same* still-in-frame code (roughly every 250ms, `QRCodeReaderService`'s `delayBetweenScanAttempts`) does not retrigger it — `RESCAN_COOLDOWN_MS` (3s) gates that, both because a code the runner is still holding up would otherwise keep the video permanently hidden behind the flash, and because retriggering every 250ms would be a flashing-content accessibility hazard (WCAG 2.3.1). Presenting the same code again after the cooldown elapses is treated as a fresh (duplicate) scan. This cooldown is separate from `lastScanResult`/`sendScanResultEffect` above, which is what actually gates re-sending to the backend and is not time-based.

The kiosk also requests a Screen Wake Lock (`navigator.wakeLock`) on load and re-requests it on `visibilitychange` — the API releases itself whenever the tab loses visibility, and a phone that locks mid-shift silently unpairs the flow. Both the wake lock and the beep/vibration are best-effort: a browser that refuses or lacks either just leaves the flash/text confirmation to carry the feedback on its own.

### CheckinComponent (`/anmeldung/annahme`) — the staff screen

This is where check-in staff sit. It has its own concept of "scanner" that's easy to confuse with the one above: `scannerIds` (loaded via `ScannerApiService.getScanners()`, `GET /scanners`) is the list of *already-registered* scanner devices, and `currentScannerId` is simply which one this staff member has chosen to listen to from a dropdown — no registration happens here.

Selecting a scanner subscribes to SSE:
```ts
this.scannerSubscription = this.sseService.listen<ScanResult>(`/sse/scanners/${scannerId}/results`)
  .subscribe((result: ScanResult) => {
    this.customerId.set(result.value);
    this.searchForCustomerId();
  });
```
So the full round trip for a physical scan is: kiosk decodes QR → `POST /scanners/{id}/results` → backend outbox → SSE push on `/sse/scanners/{id}/results` → staff screen picks it up and looks up the customer. A staff member can also just type a customer id directly into the `customerIdInput` field (autofocused via `tafelAutofocus`) without any scanner involved — the scanner path and the manual path both funnel into `searchForCustomerId()`.

Once a customer resolves, the component loads their notes (`CustomerNoteApiService`) and any already-assigned ticket for the *current* distribution (`DistributionTicketApiService.getCurrentTicketForCustomer`). Customer validity is bucketed into `CustomerState` (`LOCKED` / `INVALID` / `VALID_WARN` / `VALID`, the last based on an 8-week `VALID_UNTIL_WARNLIMIT_WEEKS` window) which drives badge color and which control gets focused next (`cancelButtonRef` on locked/invalid, `ticketNumberInputRef` otherwise) — both done via `setTimeout` after the signal update, not `effect()`.

There's also a redirect guard worth knowing about:
```ts
effect(() => {
  if (this.hasReceivedDistribution() && this.currentDistribution() === null) {
    this.router.navigate(['uebersicht']);
  }
});
```
It only fires once `hasReceivedDistribution()` (from `GlobalStateService`, set once the first `/sse/distributions` message has actually been processed) is `true` — this avoids bouncing the user back to the dashboard during the brief window before the first SSE message arrives, when `currentDistribution()` is still `null` by default. Gating on the raw SSE connection state instead (`getConnectionState()`) is *not* enough: that flips to `true` on the socket's `onopen`, which can fire a tick before the first message is actually processed, so it doesn't rule out the "not loaded yet" case — see `GlobalStateService.getHasReceivedDistribution`'s doc comment.

### Ticket monitor: TicketScreenComponent / TicketScreenControlComponent / TicketScreenFullscreenComponent

`TicketScreenComponent` renders whatever the backend currently wants shown (a start time, or a ticket number), driven entirely by SSE:
```ts
private readonly ticketScreenData = toSignal(
  this.sseService.listen<TicketScreenText>('/sse/distributions/ticket-screen/current')
);
```
It's reused in two places: embedded as a small live preview inside `TicketScreenControlComponent` (`/anmeldung/ticketmonitor-steuerung`), and full-screen via `TicketScreenFullscreenComponent`. Beyond the raw text/value, it tracks its own small piece of state derived from the SSE stream, none of which the backend needs to know about:
- **Previous ticket number**: whenever `text` equals the backend's `TICKET_SCREEN_TITLE` ("Ticket") and `value` changes, the prior value is kept in `previousTicketValue` and rendered as a smaller "Zuvor: …" caption — but never on the very first message, and it's cleared whenever the caption switches away from a ticket (e.g. to a "Startzeit" announcement), so it can't resurrect a stale number once the display moves on.
- **Change animation**: a `justChanged` signal briefly toggles a CSS pulse class on a ticket-number change, via a plain `setTimeout` pair (off → macrotask → on → timeout → off again) rather than Angular animations, since the class only needs to restart a CSS `@keyframes` rule.
- **Optional chime**: gated by the `soundEnabled` input (see below), a `playChime()` synthesizes a short beep with the Web Audio API rather than shipping an audio asset. Best-effort only — browser autoplay policy can block it until the tab has seen a user gesture.
- **Richer disconnected state**: `lastUpdateAt` is stamped on every SSE message (including the resend a fresh connection gets right after reconnecting), so the full-screen disconnected overlay can say *when* it last knew a definite state, not just that it's currently stale.

`TicketScreenControlComponent` is the staff control panel: buttons call `DistributionTicketScreenApiService` (`showText`, `showCurrentTicket`, `showPreviousTicket`, `showNextTicket(costContributionPaid)`), each a `POST` that causes the backend to broadcast a new SSE message picked up by every open `TicketScreenComponent`. It uses the newer `@angular/forms/signals` API (`form()`, `FormField`, `required`) for the start-time field rather than classic `FormGroup`. Its embedded live-preview instance never sets `soundEnabled` — the chime is exclusively a full-screen kiosk feature.

`openScreenInNewTab()` opens `/anmeldung/ticketmonitor` in a new tab via `UrlHelperService.getBaseUrl()` — this is meant to be projected onto a second monitor in the waiting area.

**Important routing detail:** `TicketScreenFullscreenComponent` is *not* a child of the `anmeldung` route group in `app.routes.ts`. It's registered as its own top-level route (`path: 'anmeldung/ticketmonitor'`, guarded only by the plain `authGuard`), so it requires being logged in but **not** the `SCANNER`/`CHECKIN` permission that gates the rest of this module. That's intentional — the monitor is a public-facing display, and whoever's logged into the kiosk running it may not hold either permission.

`TicketScreenFullscreenComponent` also owns the device-facing concerns that only make sense for a real, unattended kiosk tab — not for the tiny live preview embedded in the control screen:
- Requests a Screen Wake Lock on init and re-acquires it on `visibilitychange` (the browser releases a wake lock whenever the tab is backgrounded, so a lone initial request isn't enough to survive a tab switch).
- Offers a fullscreen button (Fullscreen API) that hides itself once fullscreen is entered and reappears on `fullscreenchange` if the browser chrome comes back (e.g. Esc).
- Reads `?sound=1` from the route's query params once, at construction, and passes it down as `TicketScreenComponent`'s `soundEnabled` input.

It reads `document`/`navigator` through Angular's `DOCUMENT`/`Window` injection tokens rather than the bare globals, purely so tests can substitute them. `Window` is fully swapped for a mock in `ticket-screen-fullscreen.component.spec.ts` (matching `ConnectivityService`'s pattern); `DOCUMENT` stays the real `document` there instead, with only the Fullscreen-API properties jsdom doesn't implement patched onto it — Angular's renderer needs a genuine `Document` to attach the fixture's host element to, so swapping the whole token for a plain object breaks rendering.

## Gotchas

- Two unrelated notions of "scanner id" exist side by side: the physical device's registered id (`ScannerComponent`, persisted in `localStorage['scanner-id']`) and the id a staff member picks to *listen to* (`CheckinComponent.currentScannerId`, no persistence). Don't conflate them when debugging.
- `sendScanResultEffect` exists specifically to avoid a race between scanner registration and camera startup — don't "simplify" it back into the QR decode callback.
- `ScannerComponent`'s scan-feedback cooldown (`RESCAN_COOLDOWN_MS`) and `sendScanResultEffect`'s dedupe (`lastScanResult`) look similar but answer different questions — one throttles the *visual/haptic* confirmation for a code still sitting in frame, the other prevents *re-sending* an already-sent scan to the backend. Don't merge them; a re-presented code after the cooldown should flash again even though it's still a duplicate the backend won't be told about twice.
- The ticket monitor's full-screen route deliberately sits outside the `SCANNER`/`CHECKIN` permission gate; if you move it under `checkin.routes.ts` you'll break the "unattended second monitor" use case.
- `CheckinComponent`'s delete-ticket button (`ticketNumberEdit()`) only appears when a ticket already existed for the customer at lookup time — it's not shown for a fresh, not-yet-assigned ticket number.
