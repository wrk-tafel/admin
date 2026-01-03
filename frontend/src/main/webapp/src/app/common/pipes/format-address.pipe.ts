import {Pipe, PipeTransform} from '@angular/core';
import {CustomerAddressData} from '../../api/customer-api.service';

@Pipe({
  name: 'formatAddress',
  standalone: true
})
export class FormatAddressPipe implements PipeTransform {
  transform(address: CustomerAddressData): string {
    if (!address) {
      return '-';
    }

    const formatted = [
      [address.street, address.houseNumber].join(' ').trim(),
      address.stairway?.trim() ? 'Stiege ' + address.stairway.trim() : undefined,
      address.door?.trim() ? 'Top ' + address.door.trim() : undefined,
      [address.postalCode, address.city].join(' ').trim()
    ]
      .filter(value => value?.trim().length > 0)
      .join(', ');
    return formatted?.trim().length > 0 ? formatted : '-';
  }
}
