import {formatEstimatedShare, formatFixedQuantity, shelterKitchenLabel} from './shelter-kitchen.util';

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

describe('formatEstimatedShare', () => {
  it('lists whole boxes per category as an estimate', () => {
    expect(formatEstimatedShare([
      {foodCategory: 'Obst / Gemüse', boxes: 3},
      {foodCategory: 'Backwaren', boxes: 1}
    ])).toBe('ca. 3 Kisten Obst / Gemüse, 1 Kiste Backwaren');
  });
});
