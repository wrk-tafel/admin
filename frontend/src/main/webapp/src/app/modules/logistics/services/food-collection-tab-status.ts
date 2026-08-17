/**
 * Save state of one "Route"/"Waren" tab on the Warenerfassung screen, shown as a badge on the tab
 * label so the single "Speichern" button's effect is visible before it is pressed - see issue #3225.
 *
 * `undefined` (no badge) means nothing has been entered yet for that tab, which is the normal state
 * before a route has been worked on and is deliberately not treated as an error.
 */
export type TabStatus = 'complete' | 'unsaved' | 'invalid';

/**
 * Combines the status of several sections that share one tab (e.g. mileage + item amounts on
 * "Waren") into the tab's own badge: invalid outranks everything else, and the combination is only
 * "complete" once every section that has anything entered is `complete` - one section still
 * `undefined` (nothing entered there yet) while another is `complete` holds the tab at `unsaved`
 * rather than showing "complete" while a required section is still outstanding (see #3332).
 * `undefined` only when every section has nothing entered.
 */
export function combineTabStatus(...statuses: (TabStatus | undefined)[]): TabStatus | undefined {
  if (statuses.every(status => status === undefined)) {
    return undefined;
  }
  if (statuses.some(status => status === 'invalid')) {
    return 'invalid';
  }
  if (statuses.every(status => status === 'complete')) {
    return 'complete';
  }
  return 'unsaved';
}
