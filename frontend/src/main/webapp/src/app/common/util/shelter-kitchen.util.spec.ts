import {shelterKitchenLabel} from './shelter-kitchen.util';

describe('shelterKitchenLabel', () => {
  it('names each of the three states', () => {
    expect(shelterKitchenLabel(true)).toBe('Ja');
    expect(shelterKitchenLabel(false)).toBe('Nein, nur kalte Speisen');
    expect(shelterKitchenLabel(null)).toBe('Unbekannt');
    expect(shelterKitchenLabel(undefined)).toBe('Unbekannt');
  });
});
