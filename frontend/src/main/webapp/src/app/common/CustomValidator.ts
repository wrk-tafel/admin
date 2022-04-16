import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";
import * as moment from "moment";

export class CustomValidators {

    static minDate(date: Date): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (control.value == null) {
                return null;
            }

            const controlDate = moment(control.value);
            if (!controlDate.isValid()) {
                return null;
            }

            const validationDate = moment(date);

            const result = !controlDate.isBefore(validationDate) ? null : {
                'mindate': {
                    'minimumDate': validationDate.format('DD.MM.YYYY'),
                    'actualDate': controlDate.format('DD.MM.YYYY')
                }
            };
            return result;
        };
    }

    static maxDate(date: Date): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (control.value == null) {
                return null;
            }

            const controlDate = moment(control.value);
            if (!controlDate.isValid()) {
                return null;
            }

            const validationDate = moment(date);

            const result = !controlDate.isAfter(validationDate) ? null : {
                'maxdate': {
                    'maximumDate': validationDate.format('DD.MM.YYYY'),
                    'actualDate': controlDate.format('DD.MM.YYYY')
                }
            };
            return result;
        };
    }

}
