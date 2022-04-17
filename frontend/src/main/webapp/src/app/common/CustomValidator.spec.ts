import { AbstractControl } from "@angular/forms";
import { CustomValidator } from "./CustomValidator";

describe('CustomValidator', () => {

    it('actualDate earlier than minDate', () => {
        var control = Object.defineProperties({} as AbstractControl, {
            value: {
                get: function get() { return new Date(1999, 0, 1) }
            }
        });

        const minDate = new Date(2000, 0, 1);
        const result = CustomValidator.minDate(minDate)(control);

        expect(result).toEqual(
            {
                'mindate': {
                    'minimumDate': '01.01.2000',
                    'actualDate': '01.01.1999'
                }
            }
        );
    });

    it('actualDate matching minDate', () => {
        var control = Object.defineProperties({} as AbstractControl, {
            value: {
                get: function get() { return new Date(2000, 0, 1) }
            }
        });

        const minDate = new Date(2000, 0, 1);
        const result = CustomValidator.minDate(minDate)(control);

        expect(result).toBe(null);
    });

    it('actualDate matching minDate time ignored', () => {
        var control = Object.defineProperties({} as AbstractControl, {
            value: {
                get: function get() { return new Date(2000, 0, 1) }
            }
        });

        const minDate = new Date(2000, 0, 1, 12, 0, 0);
        const result = CustomValidator.minDate(minDate)(control);

        expect(result).toBe(null);
    });

    it('actualDate later than minDate', () => {
        var control = Object.defineProperties({} as AbstractControl, {
            value: {
                get: function get() { return new Date(2005, 0, 1) }
            }
        });

        const minDate = new Date(2000, 0, 1);
        const result = CustomValidator.minDate(minDate)(control);

        expect(result).toBe(null);
    });

    it('actualDate earlier than maxDate', () => {
        var control = Object.defineProperties({} as AbstractControl, {
            value: {
                get: function get() { return new Date(1999, 0, 1) }
            }
        });

        const maxDate = new Date(2000, 0, 1);
        const result = CustomValidator.maxDate(maxDate)(control);

        expect(result).toBe(null);
    });

    it('actualDate matching maxDate', () => {
        var control = Object.defineProperties({} as AbstractControl, {
            value: {
                get: function get() { return new Date(2000, 0, 1) }
            }
        });

        const maxDate = new Date(2000, 0, 1);
        const result = CustomValidator.maxDate(maxDate)(control);

        expect(result).toBe(null);
    });

    it('actualDate matching maxDate time ignored', () => {
        var control = Object.defineProperties({} as AbstractControl, {
            value: {
                get: function get() { return new Date(2000, 0, 1, 12, 0, 0) }
            }
        });

        const maxDate = new Date(2000, 0, 1);
        const result = CustomValidator.maxDate(maxDate)(control);

        expect(result).toBe(null);
    });

    it('actualDate later than maxDate', () => {
        var control = Object.defineProperties({} as AbstractControl, {
            value: {
                get: function get() { return new Date(2005, 0, 1) }
            }
        });

        const maxDate = new Date(2000, 0, 1);
        const result = CustomValidator.maxDate(maxDate)(control);

        expect(result).toEqual(
            {
                'maxdate': {
                    'maximumDate': '01.01.2000',
                    'actualDate': '01.01.2005'
                }
            }
        );
    });

});
