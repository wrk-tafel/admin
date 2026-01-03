import {FormatAddressPipe} from './format-address.pipe';
import {CustomerAddressData} from '../../api/customer-api.service';

describe('FormatAddressPipe', () => {
  let pipe: FormatAddressPipe;

  beforeEach(() => {
    pipe = new FormatAddressPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should format complete address correctly', () => {
    const address: CustomerAddressData = {
      street: 'Teststraße',
      houseNumber: '123A',
      stairway: '5',
      door: '21',
      postalCode: 1020,
      city: 'Wien'
    };

    const result = pipe.transform(address);

    expect(result).toBe('Teststraße 123A, Stiege 5, Top 21, 1020 Wien');
  });

  it('should format address without stairway', () => {
    const address: CustomerAddressData = {
      street: 'Hauptstraße',
      houseNumber: '10',
      postalCode: 1030,
      city: 'Wien'
    };

    const result = pipe.transform(address);

    expect(result).toBe('Hauptstraße 10, 1030 Wien');
  });

  it('should format address without door', () => {
    const address: CustomerAddressData = {
      street: 'Mariahilfer Straße',
      houseNumber: '88',
      stairway: '2',
      postalCode: 1070,
      city: 'Wien'
    };

    const result = pipe.transform(address);

    expect(result).toBe('Mariahilfer Straße 88, Stiege 2, 1070 Wien');
  });

  it('should format minimal address', () => {
    const address: CustomerAddressData = {
      street: 'Testweg',
      houseNumber: '1',
      postalCode: 1010,
      city: 'Wien'
    };

    const result = pipe.transform(address);

    expect(result).toBe('Testweg 1, 1010 Wien');
  });

  it('should return dash for null address', () => {
    const result = pipe.transform(null);

    expect(result).toBe('-');
  });

  it('should return dash for undefined address', () => {
    const result = pipe.transform(undefined);

    expect(result).toBe('-');
  });

  it('should handle empty strings in address fields', () => {
    const address: CustomerAddressData = {
      street: 'Straße',
      houseNumber: '5',
      stairway: '',
      door: '',
      postalCode: 1050,
      city: 'Wien'
    };

    const result = pipe.transform(address);

    expect(result).toBe('Straße 5, 1050 Wien');
  });

  it('should handle whitespace-only stairway and door', () => {
    const address: CustomerAddressData = {
      street: 'Gasse',
      houseNumber: '3',
      stairway: '   ',
      door: '  ',
      postalCode: 1090,
      city: 'Wien'
    };

    const result = pipe.transform(address);

    expect(result).toBe('Gasse 3, 1090 Wien');
  });
});
