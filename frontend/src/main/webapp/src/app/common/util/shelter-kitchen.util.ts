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

/** A fixed amount as it reads on screen, e.g. "4 Kisten Backwaren (Schnittbrot)". */
export function formatFixedQuantity(amount: number, foodCategory: string, note?: string | null): string {
  const boxes = `${amount} ${amount === 1 ? 'Kiste' : 'Kisten'} ${foodCategory}`;
  return note ? `${boxes} (${note})` : boxes;
}
