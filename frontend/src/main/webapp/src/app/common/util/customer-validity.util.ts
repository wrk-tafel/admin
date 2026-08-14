import dayjs from 'dayjs';

/**
 * How much attention a customer's continued validity needs, from the most urgent state to the most
 * comfortable one - independent of whether the customer is locked, which the customer detail page
 * shows as its own separate status chip rather than folding it into this one. Mirrors the check-in
 * screen's own inline computation (`CheckinComponent.VALID_UNTIL_WARNLIMIT_WEEKS`) so "about to
 * expire" means the same thing wherever a customer's validity is shown.
 */
export enum CustomerValidityState {
  EXPIRED, WARNING, VALID
}

/** A customer within this many weeks of their `validUntil` date is flagged as "about to expire". */
export const VALID_UNTIL_WARN_WEEKS = 8;

export function computeCustomerValidityState(
  validUntil: Date | string | null | undefined,
  warnWeeks: number = VALID_UNTIL_WARN_WEEKS
): CustomerValidityState {
  const validUntilDay = dayjs(validUntil).startOf('day');
  const now = dayjs().startOf('day');

  if (!validUntilDay.isValid() || validUntilDay.isBefore(now)) {
    return CustomerValidityState.EXPIRED;
  }

  const warnLimit = now.add(warnWeeks, 'weeks');
  return validUntilDay.isAfter(warnLimit) ? CustomerValidityState.VALID : CustomerValidityState.WARNING;
}

export function customerValidityStateColor(state: CustomerValidityState): 'danger' | 'warning' | 'success' {
  switch (state) {
    case CustomerValidityState.EXPIRED:
      return 'danger';
    case CustomerValidityState.WARNING:
      return 'warning';
    case CustomerValidityState.VALID:
      return 'success';
  }
}

export function customerValidityStateText(state: CustomerValidityState): string {
  switch (state) {
    case CustomerValidityState.EXPIRED:
      return 'Abgelaufen';
    case CustomerValidityState.WARNING:
      return 'Läuft bald ab';
    case CustomerValidityState.VALID:
      return 'Gültig';
  }
}
