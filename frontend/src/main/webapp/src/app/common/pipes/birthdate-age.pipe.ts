import {Pipe, PipeTransform} from '@angular/core';
import moment from 'moment';

@Pipe({
  name: 'birthdateAge',
  standalone: true
})
export class BirthdateAgePipe implements PipeTransform {
  transform(birthDate?: Date): string {
    if (birthDate) {
      const age = moment().diff(birthDate, 'years');
      return moment(birthDate).format('DD.MM.YYYY') + ' (' + age + ')';
    }
    return '-';
  }
}
