import {AbstractControl} from '@angular/forms';
import {CustomValidator} from './CustomValidator';

describe('CustomValidator', () => {

  it('actualDate earlier than minDate', () => {
    const control = Object.defineProperties({} as AbstractControl, {
      value: {
        get: function get() {
          return new Date(1999, 0, 1);
        }
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
    const control = Object.defineProperties({} as AbstractControl, {
      value: {
        get: function get() {
          return new Date(2000, 0, 1);
        }
      }
    });

    const minDate = new Date(2000, 0, 1);
    const result = CustomValidator.minDate(minDate)(control);

    expect(result).toBe(null);
  });

  it('actualDate matching minDate time ignored', () => {
    const control = Object.defineProperties({} as AbstractControl, {
      value: {
        get: function get() {
          return new Date(2000, 0, 1);
        }
      }
    });

    const minDate = new Date(2000, 0, 1, 12, 0, 0);
    const result = CustomValidator.minDate(minDate)(control);

    expect(result).toBe(null);
  });

  it('actualDate later than minDate', () => {
    const control = Object.defineProperties({} as AbstractControl, {
      value: {
        get: function get() {
          return new Date(2005, 0, 1);
        }
      }
    });

    const minDate = new Date(2000, 0, 1);
    const result = CustomValidator.minDate(minDate)(control);

    expect(result).toBe(null);
  });

  it('actualDate earlier than maxDate', () => {
    const control = Object.defineProperties({} as AbstractControl, {
      value: {
        get: function get() {
          return new Date(1999, 0, 1);
        }
      }
    });

    const maxDate = new Date(2000, 0, 1);
    const result = CustomValidator.maxDate(maxDate)(control);

    expect(result).toBe(null);
  });

  it('actualDate matching maxDate', () => {
    const control = Object.defineProperties({} as AbstractControl, {
      value: {
        get: function get() {
          return new Date(2000, 0, 1);
        }
      }
    });

    const maxDate = new Date(2000, 0, 1);
    const result = CustomValidator.maxDate(maxDate)(control);

    expect(result).toBe(null);
  });

  it('actualDate matching maxDate time ignored', () => {
    const control = Object.defineProperties({} as AbstractControl, {
      value: {
        get: function get() {
          return new Date(2000, 0, 1, 12, 0, 0);
        }
      }
    });

    const maxDate = new Date(2000, 0, 1);
    const result = CustomValidator.maxDate(maxDate)(control);

    expect(result).toBe(null);
  });

  it('actualDate later than maxDate', () => {
    const control = Object.defineProperties({} as AbstractControl, {
      value: {
        get: function get() {
          return new Date(2005, 0, 1);
        }
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

  it('hasValue with null value', () => {
    const control = Object.defineProperties({} as AbstractControl, {
      value: {
        get: function get() {
          return null;
        }
      }
    });

    const testCallback = () => null
    const testMessage = 'todo test'

    const result = CustomValidator.hasValue(testCallback, testMessage)(control);

    expect(result).toBe(null);
  });

  it('hasValue with undefined value', () => {
    const control = Object.defineProperties({} as AbstractControl, {
      value: {
        get: function get() {
          return '12345';
        }
      }
    });

    const testCallback = () => undefined
    const testMessage = 'todo test'

    const result = CustomValidator.hasValue(testCallback, testMessage)(control);

    expect(result).toEqual(
      {
        'hasValue': {
          'message': testMessage
        }
      }
    );
  });

  it('hasValue with any value', () => {
    const control = Object.defineProperties({} as AbstractControl, {
      value: {
        get: function get() {
          return '12345';
        }
      }
    });

    const testCallback = () => 'test123'
    const testMessage = 'todo test'

    const result = CustomValidator.hasValue(testCallback, testMessage)(control);

    expect(result).toBe(null);
  });

});
