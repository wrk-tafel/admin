import {Pipe, PipeTransform} from '@angular/core';
import {Gender, GenderLabel} from '../../api/customer-api.service';

@Pipe({
  name: 'genderLabel',
  standalone: true
})
export class GenderLabelPipe implements PipeTransform {
  transform(gender?: Gender): string {
    if (gender) {
      return GenderLabel[gender];
    }
    return '-';
  }
}
