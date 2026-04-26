import {Pipe, PipeTransform} from '@angular/core';
import {ShelterItem} from '../../api/shelter-api.service';

@Pipe({
  name: 'formatShelterAddress',
  standalone: true
})
export class FormatShelterAddressPipe implements PipeTransform {
  transform(shelter: ShelterItem): string {
    if (!shelter) {
      return '-';
    }

    const formatted = [
      [shelter.addressStreet, shelter.addressHouseNumber].join(' ').trim(),
      shelter.addressStairway?.trim() ? 'Stiege ' + shelter.addressStairway.trim() : undefined,
      shelter.addressDoor?.trim() ? 'Top ' + shelter.addressDoor.trim() : undefined,
      [shelter.addressPostalCode, shelter.addressCity].join(' ').trim()
    ]
      .filter(value => value?.trim().length > 0)
      .join(', ');
    return formatted?.trim().length > 0 ? formatted : '-';
  }
}
