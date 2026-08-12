/**
 * The one shape a license plate is stored and compared in.
 *
 * The Warenerfassung's car dropdown lists the plates verbatim, so `w-12345x` entered next to an
 * existing `W-12345X` reads as a second vehicle. Both the create dialog and the inline edit
 * normalize while the admin types; `CarService` does the same server-side, so a plate that reaches
 * the database through any other route is stored the same way.
 */
export function normalizeLicensePlate(licensePlate: string): string {
  return licensePlate.trim().toUpperCase();
}
