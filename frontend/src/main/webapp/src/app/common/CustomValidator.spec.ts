import { CustomValidators } from "./CustomValidator";

describe('CustomValidator', () => {

    function setup() {
        const controlSpy = jasmine.createSpyObj('AbstractControl', ['value']);
        return { controlSpy };
    }

    it('minDate too early', () => {
        const { controlSpy } = setup();
        controlSpy.value.and.returnValue('1999-01-01');

        const minDate = new Date(2000, 0, 1);
        const result = CustomValidators.minDate(minDate)(controlSpy);

        expect(result).toEqual(
            {
                'mindate': {
                    'minimumDate': '01.01.2000',
                    'actualDate': '01.01.1999'
                }
            }
        );
    });

});
