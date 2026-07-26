import {Pipe, PipeTransform} from '@angular/core';
import dayjs from 'dayjs';

@Pipe({
  name: 'birthdateAge',
  standalone: true
})
export class BirthdateAgePipe implements PipeTransform {
  transform(birthDate?: Date | null): string {
    if (birthDate) {
      const age = dayjs().diff(birthDate, 'years');
      return dayjs(birthDate).format('DD.MM.YYYY') + ' (' + age + ')';
    }
    return '-';
  }
}
