import {formatFixedQuantity, shelterKitchenLabel} from './shelter-kitchen.util';

describe('shelterKitchenLabel', () => {
  it('names each of the three states', () => {
    expect(shelterKitchenLabel(true)).toBe('Ja');
    expect(shelterKitchenLabel(false)).toBe('Nein, nur kalte Speisen');
    expect(shelterKitchenLabel(null)).toBe('Unbekannt');
    expect(shelterKitchenLabel(undefined)).toBe('Unbekannt');
  });
});

describe('formatFixedQuantity', () => {
  it('reads as boxes of a category, with the note when there is one', () => {
    expect(formatFixedQuantity(4, 'Backwaren', 'Schnittbrot')).toBe('4 Kisten Backwaren (Schnittbrot)');
    expect(formatFixedQuantity(1, 'Milchprodukte')).toBe('1 Kiste Milchprodukte');
    expect(formatFixedQuantity(2, 'Obst / Gemüse', null)).toBe('2 Kisten Obst / Gemüse');
  });
});
