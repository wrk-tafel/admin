import {combineTabStatus} from './food-collection-tab-status';

describe('combineTabStatus', () => {

  it('is undefined when nothing has anything entered', () => {
    expect(combineTabStatus()).toBeUndefined();
    expect(combineTabStatus(undefined, undefined)).toBeUndefined();
  });

  it('reports the single defined status unchanged', () => {
    expect(combineTabStatus(undefined, 'complete')).toBe('complete');
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

});
