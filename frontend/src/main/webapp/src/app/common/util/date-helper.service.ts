import {Injectable} from '@angular/core';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class DateHelperService {

  formatDate(date: Date) {
    return moment(date).format('DD.MM.YYYY');
  }

}
