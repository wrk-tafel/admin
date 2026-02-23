import {getErrorMessages, shouldShowErrors} from './signal-form-helper';
import {signal} from '@angular/core';

describe('Signal Form Helper', () => {

  describe('getErrorMessages', () => {
    it('should return empty array when no errors', () => {
      const mockFieldState = {
        errors: () => []
      } as any;

      const result = getErrorMessages(mockFieldState);

      expect(result).toEqual([]);
    });

    it('should return empty array when errors is undefined', () => {
      const mockFieldState = {
        errors: () => undefined
      } as any;

      const result = getErrorMessages(mockFieldState);

      expect(result).toEqual([]);
    });

    it('should return error messages from errors array', () => {
      const mockFieldState = {
        errors: () => [
          {kind: 'required', message: 'Pflichtfeld'},
          {kind: 'maxLength', message: 'Zu lang'}
        ]
      } as any;

      const result = getErrorMessages(mockFieldState);

      expect(result).toEqual(['Pflichtfeld', 'Zu lang']);
    });

    it('should filter out errors without messages', () => {
      const mockFieldState = {
        errors: () => [
          {kind: 'required', message: 'Pflichtfeld'},
          {kind: 'custom'},
          {kind: 'maxLength', message: 'Zu lang'}
        ]
      } as any;

      const result = getErrorMessages(mockFieldState);

      expect(result).toEqual(['Pflichtfeld', 'Zu lang']);
    });

    it('should filter out empty string messages', () => {
      const mockFieldState = {
        errors: () => [
          {kind: 'required', message: 'Pflichtfeld'},
          {kind: 'custom', message: ''},
          {kind: 'maxLength', message: 'Zu lang'}
        ]
      } as any;

      const result = getErrorMessages(mockFieldState);

      expect(result).toEqual(['Pflichtfeld', 'Zu lang']);
    });
  });

  describe('shouldShowErrors', () => {
    it('should return false when field is valid', () => {
      const mockFieldState = {
        valid: () => true,
        dirty: () => false,
        touched: () => false
      } as any;

      const result = shouldShowErrors(mockFieldState);

      expect(result).toBe(false);
    });

    it('should return false when field is invalid but not touched or dirty', () => {
      const mockFieldState = {
        valid: () => false,
        dirty: () => false,
        touched: () => false
      } as any;

      const result = shouldShowErrors(mockFieldState);

      expect(result).toBe(false);
    });

    it('should return true when field is invalid and dirty', () => {
      const mockFieldState = {
        valid: () => false,
        dirty: () => true,
        touched: () => false
      } as any;

      const result = shouldShowErrors(mockFieldState);

      expect(result).toBe(true);
    });

    it('should return true when field is invalid and touched', () => {
      const mockFieldState = {
        valid: () => false,
        dirty: () => false,
        touched: () => true
      } as any;

      const result = shouldShowErrors(mockFieldState);

      expect(result).toBe(true);
    });

    it('should return true when field is invalid, dirty and touched', () => {
      const mockFieldState = {
        valid: () => false,
        dirty: () => true,
        touched: () => true
      } as any;

      const result = shouldShowErrors(mockFieldState);

      expect(result).toBe(true);
    });
  });

});
