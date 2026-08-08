import {Pipe, PipeTransform} from '@angular/core';
import {ShopItem} from '../../api/shop-api.service';

@Pipe({
  name: 'formatShopAddress',
  standalone: true
})
export class FormatShopAddressPipe implements PipeTransform {
  transform(shop?: ShopItem | null): string {
    if (!shop) {
      return '-';
    }

    const formatted = [
      shop.addressStreet?.trim(),
      [shop.addressPostalCode, shop.addressCity].join(' ').trim()
    ]
      .filter(value => (value?.trim().length ?? 0) > 0)
      .join(', ');
    return formatted.trim().length > 0 ? formatted : '-';
  }
}
