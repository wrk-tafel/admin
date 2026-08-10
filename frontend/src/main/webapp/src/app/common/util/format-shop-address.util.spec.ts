import {formatShopAddress} from './format-shop-address.util';
import {ShopItem} from '../../api/shop-api.service';

describe('formatShopAddress', () => {
  const shop: ShopItem = {
    id: 1,
    number: 100,
    name: 'Billa',
    addressStreet: 'Teststraße 1',
    addressPostalCode: 1100,
    addressCity: 'Wien',
    foodUnit: 'BOX',
    enabled: true
  };

  it('formats street, postal code and city', () => {
    expect(formatShopAddress(shop)).toBe('Teststraße 1, 1100 Wien');
  });

  it('returns an empty string without a shop', () => {
    expect(formatShopAddress(null)).toBe('');
    expect(formatShopAddress(undefined)).toBe('');
  });

  it('skips a blank street', () => {
    expect(formatShopAddress({...shop, addressStreet: '  '})).toBe('1100 Wien');
  });

});
