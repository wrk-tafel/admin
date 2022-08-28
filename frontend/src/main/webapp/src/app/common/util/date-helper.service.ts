import { Injectable } from '@angular/core';
import * as moment from 'moment';

@Injectable({
    providedIn: 'root'
})
export class DateHelperService {

    convertForInputField(date: Date) {
        return date.toISOString().substring(0, 10)
    }

    formatDate(date: Date) {
        return moment(date).format('DD.MM.YYYY')
    }

}
