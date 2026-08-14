// Google's directions endpoint, shared by whatever needs a driving-directions link to an address:
// the Routen-Navi (a single stop, or the remaining stops as waypoints) and the shops admin screen's
// map link for a single address.
export const MAPS_DIRECTIONS_URL = 'https://www.google.com/maps/dir/?api=1';

/**
 * A Google Maps driving-directions link to a single address. Used wherever only one destination is
 * ever navigated to at a time - the shops admin screen's address, and each Routen-Navi stop's own
 * "Navigation starten" button. A route's link over several stops in one go builds its own URL with
 * `MAPS_DIRECTIONS_URL` directly, since that one also needs waypoints.
 */
export function buildSingleDestinationMapsUrl(address: string): string {
  return `${MAPS_DIRECTIONS_URL}&destination=${encodeURIComponent(address)}&travelmode=driving`;
}
