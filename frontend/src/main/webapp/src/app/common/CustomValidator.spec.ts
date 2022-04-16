import { CustomValidators } from "./CustomValidator";

describe('CustomValidator', () => {

    it('minDate too early', () => {
        const controlSpy = jasmine.createSpyObj('AbstractControl', ['value']);

        const actualDate = new Date(1999, 0, 1);
        controlSpy.value.and.returnValue(actualDate);

        const minDate = new Date(2000, 0, 1);
        const result = CustomValidators.minDate(minDate)(controlSpy);

        expect(result).toBe(null);
    });

});
