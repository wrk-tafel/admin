import {combineTabStatus} from './food-collection-tab-status';

describe('combineTabStatus', () => {

  it('is undefined when nothing has anything entered', () => {
    expect(combineTabStatus()).toBeUndefined();
    expect(combineTabStatus(undefined, undefined)).toBeUndefined();
  });

  it('reports the single defined status unchanged', () => {
    expect(combineTabStatus(undefined, 'unsaved')).toBe('unsaved');
    expect(combineTabStatus('unsaved', undefined)).toBe('unsaved');
  });

  it('invalid outranks unsaved and complete', () => {
    expect(combineTabStatus('complete', 'invalid')).toBe('invalid');
    expect(combineTabStatus('unsaved', 'invalid')).toBe('invalid');
    expect(combineTabStatus('invalid', 'invalid')).toBe('invalid');
  });

  it('unsaved outranks complete when neither is invalid', () => {
    expect(combineTabStatus('complete', 'unsaved')).toBe('unsaved');
  });

  it('complete only when every defined status is complete', () => {
    expect(combineTabStatus('complete', 'complete')).toBe('complete');
  });

  // A section that still has nothing entered (undefined) is not the same as one that is
  // genuinely done - a required section left untouched must not let the combined tab read
  // "complete" (see #3332: the "Waren" tab showed complete with item amounts saved and the
  // mileage fields still empty).
  it('is unsaved, not complete, while one section is still untouched and another is complete', () => {
    expect(combineTabStatus(undefined, 'complete')).toBe('unsaved');
    expect(combineTabStatus('complete', undefined)).toBe('unsaved');
  });

});
