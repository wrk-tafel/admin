# ADR-0040: Navigation along a route is a deep link into the device's map app

**Status:** accepted · **Recorded:** 2026-08-09

## Context

[#2893](https://github.com/wrk-tafel/admin/issues/2893) asked for a screen that guides a driver
along a collection route — "turn by turn navigation and shop infos".

The application knows a route as an ordered list of stops (`routes_stops`, ordered by `time`), and a
stop as an optional reference to a shop. What it knows about a shop is `address_street`,
`address_postal_code` and `address_city` — three strings a human typed. There is no latitude, no
longitude, and no opening hours; nothing in the schema has ever held a coordinate.

Turn-by-turn guidance needs three things this application has none of: coordinates for every
destination, a routing engine, and a map surface to draw on. Every one of them is an outside service
with a key, a quota and a bill, and the first of them also needs a geocoding pass over addresses
that were never validated against a gazetteer — a food bank's shop list contains entries like
"Hofer 13" that resolve to the wrong place, or to nothing, more often than a driver would tolerate.

Meanwhile every driver already carries a device with a map application that does all three, that
they already know how to use, and that already has their traffic settings, their offline maps and
their preferred voice.

## Decision

**The application does not navigate. It hands an address to whatever the device uses for maps.**

`RouteGuidanceComponent`
(`frontend/src/main/webapp/src/app/modules/logistics/views/route-guidance/route-guidance.component.ts`)
builds a Google Maps directions URL and renders it as a plain link with `target="_blank"`:

```
https://www.google.com/maps/dir/?api=1&destination=<address>&travelmode=driving
```

Two links exist: one per stop, and one over the stops still open, which adds the intermediate ones
as `waypoints`. `https://www.google.com/maps/dir/?api=1` is Google's documented, key-less URL API;
Android and iOS hand it to the installed Maps app, and a desktop browser opens the web map. Nothing
is embedded in the page, no script is loaded from a third party, and the address is the only thing
that leaves the application.

The route's own ordering is what the screen shows; the map link is an aid for the leg the driver is
on, not the source of the plan.

## Consequences

What it buys: the feature ships without a maps contract, without an API key in the deployment, and
without a geocoding column that would have to be kept in sync with an address a settings screen can
change at any time. It also degrades to something usable — a driver with no map app still sees the
address, the phone number and the contact person, which is what the paper list held.

What it costs:

- **A named third party in a user-facing path.** The link goes to Google. It is an outbound link
  rather than an embedded script, so it loads nothing into the page and follows no user until it is
  clicked, but the destination address does reach Google at that moment.
- **Nine waypoints.** Google's directions URL takes an origin, a destination and at most nine
  waypoints. Route 1 in the test data has fifteen stops. The "remaining route" link therefore covers
  the next ten stops and the screen says so; beyond that a driver navigates stop by stop.
- **No ETA, no distance, no re-ordering.** The application cannot tell a driver how long a leg
  takes, cannot warn that a route is running late, and cannot optimise the stop order — all of which
  a routing engine would have made possible.
- **The address string is the whole contract.** A shop whose address is mistyped in the settings
  screen navigates to the wrong place, and the application has no way to notice. This makes
  `/einstellungen/filialen` a more load-bearing screen than it was.

## Alternatives considered

**Embed a map (Leaflet + OpenStreetMap, or the Google Maps JS SDK) with the stops as markers.**
The obvious reading of "turn by turn". It loses on the data: markers need coordinates, and getting
them means geocoding every shop address, storing the result, re-geocoding when a shop is edited, and
deciding what to do with the addresses that do not resolve. That is a schema change, a background
job and a failure mode, in service of a map the driver's phone already draws better — with live
traffic, which the embedded one would not have.

**Store coordinates on the shop and let an operator pick them on a map in the settings screen.**
Removes the geocoding-accuracy problem by making it a human's job. Rejected for this issue: it puts
the cost of the feature on the people maintaining the shop list, before anyone has used the driver
screen once. It stays open as a follow-up if the deep link turns out not to be enough — the link
would then carry `lat,lng` instead of an address, and nothing else about the screen would change.

**A `geo:` URI (`geo:0,0?q=<address>`).** The vendor-neutral scheme, which Android hands to whatever
map app the user has set as default. Rejected because it does nothing at all in a desktop browser
and is inconsistently handled on iOS, and this screen is also opened on a laptop before the drive.
The `https://` URL works everywhere and still opens the native app where one is installed.

## References

- [#2893](https://github.com/wrk-tafel/admin/issues/2893) — the request this answers
- `frontend/src/main/webapp/src/app/modules/logistics/views/route-guidance/route-guidance.component.ts` — the URL construction and the ten-stop cap
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/logistics/internal/RouteGuidanceService.kt` — the read model behind the screen
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/logistics/README.md` — the route/shop data the decision is constrained by
