import {Pipe, PipeTransform} from '@angular/core';
import {Gender, genderLabel} from '../../api/customer-api.service';

@Pipe({
  name: 'genderLabel',
  standalone: true
})
export class GenderLabelPipe implements PipeTransform {
  transform(gender?: Gender | null): string {
    if (gender) {
      return genderLabel[gender];
    }
    return '-';
  }
}
