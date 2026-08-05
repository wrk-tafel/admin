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

Despite what the top-level `AGENTS.md` says (`html5-qrcode`), this module does **not** use `html5-qrcode` anywhere. It uses `@zxing/browser`'s `BrowserQRCodeReader` — check `package.json` (`@zxing/browser`, `@zxing/library`) and `qrcode-reader.service.ts` if in doubt. Treat the `AGENTS.md` line as stale.

The service is a thin wrapper: `getCameras()` lists video devices, `init(elementId, successCallback)` remembers which `<video>` element and callback to use, and `start(cameraId)` / `restart(cameraId)` / `stop()` manage the actual `decodeFromVideoDevice` call. The last-used camera id is persisted to `localStorage` under `TAFEL_LAST_CAMERA_ID` so a kiosk reopening the page reuses the same camera.

### ScannerComponent (`/anmeldung/scanner`) — the kiosk device

This is what runs on the physical scanning station (handheld scanner or webcam kiosk). On load it does two things concurrently (`initEffect`):

1. **Registers itself** as a scanner: reads an existing scanner id from `localStorage['scanner-id']` if present and calls `ScannerApiService.registerScanner(existingScannerId)` (`POST /scanners/register`). The backend either confirms the existing id or issues a new one, which is written back to `localStorage`. Clearing that key (or using a different browser) gets you a *new* scanner id.
2. **Starts the camera**: lists cameras, picks the last-used one (or the first), and starts decoding.

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

`TicketScreenComponent` is a dumb display component — it just renders whatever the backend currently wants shown (a start time, or a ticket number), driven entirely by SSE:
```ts
private readonly ticketScreenData = toSignal(
  this.sseService.listen<TicketScreenText>('/sse/distributions/ticket-screen/current')
);
```
It's reused in two places: embedded as a small live preview inside `TicketScreenControlComponent` (`/anmeldung/ticketmonitor-steuerung`), and full-screen via `TicketScreenFullscreenComponent`.

`TicketScreenControlComponent` is the staff control panel: buttons call `DistributionTicketScreenApiService` (`showText`, `showCurrentTicket`, `showPreviousTicket`, `showNextTicket(costContributionPaid)`), each a `POST` that causes the backend to broadcast a new SSE message picked up by every open `TicketScreenComponent`. It uses the newer `@angular/forms/signals` API (`form()`, `FormField`, `required`) for the start-time field rather than classic `FormGroup`.

`openScreenInNewTab()` opens `/anmeldung/ticketmonitor` in a new tab via `UrlHelperService.getBaseUrl()` — this is meant to be projected onto a second monitor in the waiting area.

**Important routing detail:** `TicketScreenFullscreenComponent` is *not* a child of the `anmeldung` route group in `app.routes.ts`. It's registered as its own top-level route (`path: 'anmeldung/ticketmonitor'`, guarded only by the plain `authGuard`), so it requires being logged in but **not** the `SCANNER`/`CHECKIN` permission that gates the rest of this module. That's intentional — the monitor is a public-facing display, and whoever's logged into the kiosk running it may not hold either permission.

## Gotchas

- The `AGENTS.md` claim of `html5-qrcode` is wrong for this codebase today; it's `@zxing/browser`.
- Two unrelated notions of "scanner id" exist side by side: the physical device's registered id (`ScannerComponent`, persisted in `localStorage['scanner-id']`) and the id a staff member picks to *listen to* (`CheckinComponent.currentScannerId`, no persistence). Don't conflate them when debugging.
- `sendScanResultEffect` exists specifically to avoid a race between scanner registration and camera startup — don't "simplify" it back into the QR decode callback.
- The ticket monitor's full-screen route deliberately sits outside the `SCANNER`/`CHECKIN` permission gate; if you move it under `checkin.routes.ts` you'll break the "unattended second monitor" use case.
- `CheckinComponent`'s delete-ticket button (`ticketNumberEdit()`) only appears when a ticket already existed for the customer at lookup time — it's not shown for a fresh, not-yet-assigned ticket number.
