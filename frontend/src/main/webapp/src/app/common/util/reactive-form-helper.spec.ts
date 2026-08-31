import {isControlInvalid} from './reactive-form-helper';

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

});
