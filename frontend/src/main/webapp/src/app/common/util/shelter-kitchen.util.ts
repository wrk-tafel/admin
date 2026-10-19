/**
 * How a shelter's kitchen reads on screen. `null`/`undefined` means nobody knows yet, which must not
 * read as "no kitchen" - a driver would otherwise hold back food the shelter could well cook.
 */
export function shelterKitchenLabel(hasKitchen: boolean | null | undefined): string {
  if (hasKitchen === true) {
    return 'Ja';
  }
  if (hasKitchen === false) {
    return 'Nein, nur kalte Speisen';
  }
  return 'Unbekannt';
}
