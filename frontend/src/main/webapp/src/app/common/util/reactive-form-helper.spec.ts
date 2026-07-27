import {controlStateClasses} from './reactive-form-helper';

describe('Reactive Form Helper', () => {

  describe('controlStateClasses', () => {
    it('should mark an untouched invalid control as neither invalid nor valid', () => {
      const mockControl = {
        invalid: true,
        valid: false,
        dirty: false,
        touched: false
      } as any;

      const result = controlStateClasses(mockControl);

      expect(result).toEqual({'is-invalid': false, 'is-valid': false});
    });

    it('should mark a touched invalid control as is-invalid', () => {
      const mockControl = {
        invalid: true,
        valid: false,
        dirty: false,
        touched: true
      } as any;

      const result = controlStateClasses(mockControl);

      expect(result).toEqual({'is-invalid': true, 'is-valid': false});
    });

    it('should mark a dirty valid control as is-valid', () => {
      const mockControl = {
        invalid: false,
        valid: true,
        dirty: true,
        touched: false
      } as any;

      const result = controlStateClasses(mockControl);

      expect(result).toEqual({'is-invalid': false, 'is-valid': true});
    });
  });

});
