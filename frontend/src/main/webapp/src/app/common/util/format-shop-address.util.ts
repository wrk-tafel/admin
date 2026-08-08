import {ShopItem} from '../../api/shop-api.service';

/**
 * One-line address of a shop ("Straße, PLZ Ort"), skipping the parts that are blank. Used while
 * assembling the view models of the shops and routes settings screens.
 */
export function formatShopAddress(shop?: ShopItem | null): string {
  if (!shop) {
    return '';
  }

  return [
    shop.addressStreet?.trim(),
    [shop.addressPostalCode, shop.addressCity].join(' ').trim()
  ]
    .filter(value => (value?.trim().length ?? 0) > 0)
    .join(', ')
    .trim();
}
