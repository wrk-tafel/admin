import {controlStateClasses, isControlInvalid, isControlValid} from './reactive-form-helper';

describe('Reactive Form Helper', () => {

  describe('isControlInvalid', () => {
    it('should return false when control is invalid but not touched', () => {
      const mockControl = {invalid: true, touched: false} as any;

      expect(isControlInvalid(mockControl)).toBe(false);
    });

    it('should return true when control is invalid and touched', () => {
      const mockControl = {invalid: true, touched: true} as any;

      expect(isControlInvalid(mockControl)).toBe(true);
    });

    it('should return false when control is touched but valid', () => {
      const mockControl = {invalid: false, touched: true} as any;

      expect(isControlInvalid(mockControl)).toBe(false);
    });
  });

  describe('isControlValid', () => {
    it('should return false when control is valid but neither dirty nor touched', () => {
      const mockControl = {valid: true, dirty: false, touched: false} as any;

      expect(isControlValid(mockControl)).toBe(false);
    });

    it('should return true when control is valid and dirty', () => {
      const mockControl = {valid: true, dirty: true, touched: false} as any;

      expect(isControlValid(mockControl)).toBe(true);
    });

    it('should return true when control is valid and touched', () => {
      const mockControl = {valid: true, dirty: false, touched: true} as any;

      expect(isControlValid(mockControl)).toBe(true);
    });

    it('should return false when control is dirty but invalid', () => {
      const mockControl = {valid: false, dirty: true, touched: false} as any;

      expect(isControlValid(mockControl)).toBe(false);
    });
  });

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
