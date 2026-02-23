import {ChildFieldContext} from '@angular/forms/signals';
import moment from 'moment';

/**
 * Custom validators for Angular Signal Forms
 */

/**
 * Validates that a date field is not before a minimum date
 *
 * @param date The minimum date
 * @param options Optional message configuration
 * @returns Validator function for signal forms
 */
export function minDate(date: Date, options?: { message?: string }) {
  return (context: ChildFieldContext<any>) => {
    const value = context.value();

    if (value == null) {
      return undefined;
    }

    const controlDate = moment(value).startOf('day');
    if (!controlDate.isValid()) {
      return undefined;
    }

    const validationDate = moment(date).startOf('day');

    if (!controlDate.isBefore(validationDate)) {
      return undefined;
    }

    const defaultMessage = `Datum muss nach dem ${validationDate.format('DD.MM.YYYY')} liegen`;
    return {
      kind: 'minDate',
      message: options?.message || defaultMessage,
      minimumDate: validationDate.format('DD.MM.YYYY'),
      actualDate: controlDate.format('DD.MM.YYYY')
    };
  };
}

/**
 * Validates that a date field is not after a maximum date
 *
 * @param date The maximum date
 * @param options Optional message configuration
 * @returns Validator function for signal forms
 */
export function maxDate(date: Date, options?: { message?: string }) {
  return (context: ChildFieldContext<any>) => {
    const value = context.value();

    if (value == null) {
      return undefined;
    }

    const controlDate = moment(value).startOf('day');
    if (!controlDate.isValid()) {
      return undefined;
    }

    const validationDate = moment(date).startOf('day');

    if (!controlDate.isAfter(validationDate)) {
      return undefined;
    }

    const defaultMessage = `Datum darf nicht nach dem ${validationDate.format('DD.MM.YYYY')} liegen`;
    return {
      kind: 'maxDate',
      message: options?.message || defaultMessage,
      maximumDate: validationDate.format('DD.MM.YYYY'),
      actualDate: controlDate.format('DD.MM.YYYY')
    };
  };
}

/**
 * Validates that a field matches a pattern (regex)
 *
 * @param pattern The regex pattern
 * @param options Optional message configuration
 * @returns Validator function for signal forms
 */
export function pattern(patternRegex: string | RegExp, options?: { message?: string }) {
  return (context: ChildFieldContext<any>) => {
    const value = context.value();

    if (value == null || value === '') {
      return undefined;
    }

    const regex = typeof patternRegex === 'string' ? new RegExp(patternRegex) : patternRegex;

    if (regex.test(value)) {
      return undefined;
    }

    return {
      kind: 'pattern',
      message: options?.message || 'Ungültiges Format',
      pattern: regex.toString(),
      actualValue: value
    };
  };
}

/**
 * Validates that a number is at least a minimum value
 *
 * @param min The minimum value
 * @param options Optional message configuration
 * @returns Validator function for signal forms
 */
export function min(minValue: number, options?: { message?: string }) {
  return (context: ChildFieldContext<any>) => {
    const value = context.value();

    if (value == null || value === '') {
      return undefined;
    }

    const numValue = typeof value === 'number' ? value : parseFloat(value);

    if (isNaN(numValue) || numValue >= minValue) {
      return undefined;
    }

    return {
      kind: 'min',
      message: options?.message || `Wert muss mindestens ${minValue} sein`,
      min: minValue,
      actual: numValue
    };
  };
}

/**
 * Validates email format
 *
 * @param options Optional message configuration
 * @returns Validator function for signal forms
 */
export function email(options?: { message?: string }) {
  return (context: ChildFieldContext<any>) => {
    const value = context.value();

    if (value == null || value === '') {
      return undefined;
    }

    // Email regex pattern (simplified version)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (emailRegex.test(value)) {
      return undefined;
    }

    return {
      kind: 'email',
      message: options?.message || 'Ungültige E-Mail-Adresse',
      actualValue: value
    };
  };
}
