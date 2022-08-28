import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class DateHelperService {

    convertForInputField(date: Date) {
        return date.toISOString().substring(0, 10)
    }

}
