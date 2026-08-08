import {FormatShopAddressPipe} from './format-shop-address.pipe';
import {ShopItem} from '../../api/shop-api.service';

describe('FormatShopAddressPipe', () => {
  const pipe = new FormatShopAddressPipe();

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
    expect(pipe.transform(shop)).toBe('Teststraße 1, 1100 Wien');
  });

  it('returns a dash without a shop', () => {
    expect(pipe.transform(null)).toBe('-');
    expect(pipe.transform(undefined)).toBe('-');
  });

  it('skips a blank street', () => {
    expect(pipe.transform({...shop, addressStreet: '  '})).toBe('1100 Wien');
  });

});
