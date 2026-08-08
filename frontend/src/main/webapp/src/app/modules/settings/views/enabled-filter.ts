/**
 * Active/inactive filter shared by the routes and shops screens, which both list records that are
 * disabled instead of deleted and therefore need a way to hide the archived ones.
 */
export type EnabledFilter = 'ALL' | 'ENABLED' | 'DISABLED';

export function matchesEnabledFilter(enabled: boolean, filter: EnabledFilter): boolean {
  switch (filter) {
    case 'ENABLED':
      return enabled;
    case 'DISABLED':
      return !enabled;
    default:
      return true;
  }
}
