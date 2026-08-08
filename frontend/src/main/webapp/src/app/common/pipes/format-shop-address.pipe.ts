import {Pipe, PipeTransform} from '@angular/core';
import {ShopItem} from '../../api/shop-api.service';

// the plain function exists next to the pipe so components can build the same address string
// outside a template (e.g. while assembling a view model)
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

@Pipe({
  name: 'formatShopAddress',
  standalone: true
})
export class FormatShopAddressPipe implements PipeTransform {
  transform(shop?: ShopItem | null): string {
    return formatShopAddress(shop) || '-';
  }
}
