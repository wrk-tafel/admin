import {describe, expect, it} from 'vitest';
import dayjs from 'dayjs';
import {
  computeCustomerValidityState,
  customerValidityStateColor,
  customerValidityStateText,
  CustomerValidityState,
  VALID_UNTIL_WARN_WEEKS
} from './customer-validity.util';

describe('computeCustomerValidityState', () => {

  it('is EXPIRED for a date in the past', () => {
    expect(computeCustomerValidityState(dayjs().subtract(1, 'day').toDate())).toBe(CustomerValidityState.EXPIRED);
  });

  it('is WARNING for today (0 weeks away trivially falls inside the warn window)', () => {
    expect(computeCustomerValidityState(dayjs().startOf('day').toDate())).toBe(CustomerValidityState.WARNING);
  });

  it('is EXPIRED for an unparseable value', () => {
    expect(computeCustomerValidityState(null)).toBe(CustomerValidityState.EXPIRED);
    expect(computeCustomerValidityState('not-a-date')).toBe(CustomerValidityState.EXPIRED);
  });

  // dayjs resolves a missing value to "now" rather than an invalid date - mirroring the check-in
  // screen's own computation rather than special-casing it, since a saved household always carries
  // a validUntil in practice.
  it('treats a missing value as "now", which falls inside the warn window', () => {
    expect(computeCustomerValidityState(undefined)).toBe(CustomerValidityState.WARNING);
  });

  it('is WARNING within the warn window', () => {
    expect(computeCustomerValidityState(dayjs().add(2, 'weeks').toDate())).toBe(CustomerValidityState.WARNING);
    expect(computeCustomerValidityState(dayjs().add(VALID_UNTIL_WARN_WEEKS, 'weeks').startOf('day').toDate()))
      .toBe(CustomerValidityState.WARNING);
  });

  it('is VALID just past the warn window', () => {
    expect(computeCustomerValidityState(dayjs().add(VALID_UNTIL_WARN_WEEKS, 'weeks').add(1, 'day').toDate()))
      .toBe(CustomerValidityState.VALID);
  });

  it('is VALID well in the future', () => {
    expect(computeCustomerValidityState(dayjs().add(1, 'year').toDate())).toBe(CustomerValidityState.VALID);
  });

  it('honors a custom warn window', () => {
    expect(computeCustomerValidityState(dayjs().add(3, 'weeks').toDate(), 2)).toBe(CustomerValidityState.VALID);
    expect(computeCustomerValidityState(dayjs().add(1, 'weeks').toDate(), 2)).toBe(CustomerValidityState.WARNING);
  });

});

describe('customerValidityStateColor', () => {

  it('maps every state to its severity color', () => {
    expect(customerValidityStateColor(CustomerValidityState.EXPIRED)).toBe('danger');
    expect(customerValidityStateColor(CustomerValidityState.WARNING)).toBe('warning');
    expect(customerValidityStateColor(CustomerValidityState.VALID)).toBe('success');
  });

});

describe('customerValidityStateText', () => {

  it('maps every state to its German label', () => {
    expect(customerValidityStateText(CustomerValidityState.EXPIRED)).toBe('Abgelaufen');
    expect(customerValidityStateText(CustomerValidityState.WARNING)).toBe('Läuft bald ab');
    expect(customerValidityStateText(CustomerValidityState.VALID)).toBe('Gültig');
  });

});
