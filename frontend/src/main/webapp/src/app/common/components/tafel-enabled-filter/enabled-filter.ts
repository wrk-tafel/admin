/**
 * Which records of a list a status filter lets through - the value `tafel-enabled-filter` carries.
 *
 * Every settings list whose records are deactivated instead of deleted needs one, because such a
 * list only ever grows and the working set is the active part of it.
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
