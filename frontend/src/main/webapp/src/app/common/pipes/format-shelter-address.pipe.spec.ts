import {FormatShelterAddressPipe} from './format-shelter-address.pipe';
import {ShelterItem} from '../../api/shelter-api.service';

describe('FormatShelterAddressPipe', () => {
  let pipe: FormatShelterAddressPipe;

  beforeEach(() => {
    pipe = new FormatShelterAddressPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should format complete address correctly', () => {
    const shelter: ShelterItem = {
      id: 1,
      name: 'Test 1',
      note: 'Note 1',
      personsCount: 10,
      addressStreet: 'Teststraße',
      addressHouseNumber: '123A',
      addressStairway: '5',
      addressDoor: '21',
      addressPostalCode: 1020,
      addressCity: 'Wien',
      enabled: true
    };

    const result = pipe.transform(shelter);

    expect(result).toBe('Teststraße 123A, Stiege 5, Top 21, 1020 Wien');
  });

  it('should format address without stairway', () => {
    const shelter: ShelterItem = {
      id: 1,
      name: 'Test 1',
      note: 'Note 1',
      personsCount: 10,
      addressStreet: 'Hauptstraße',
      addressHouseNumber: '10',
      addressPostalCode: 1030,
      addressCity: 'Wien',
      enabled: true
    };

    const result = pipe.transform(shelter);

    expect(result).toBe('Hauptstraße 10, 1030 Wien');
  });

  it('should format address without door', () => {
    const shelter: ShelterItem = {
      id: 1,
      name: 'Test 1',
      note: 'Note 1',
      personsCount: 10,
      addressStreet: 'Mariahilfer Straße',
      addressStairway: '2',
      addressHouseNumber: '88',
      addressPostalCode: 1070,
      addressCity: 'Wien',
      enabled: true
    };

    const result = pipe.transform(shelter);

    expect(result).toBe('Mariahilfer Straße 88, Stiege 2, 1070 Wien');
  });

  it('should format minimal address', () => {
    const shelter: ShelterItem = {
      id: 1,
      name: 'Test 1',
      note: 'Note 1',
      personsCount: 10,
      addressStreet: 'Testweg',
      addressHouseNumber: '1',
      addressPostalCode: 1010,
      addressCity: 'Wien',
      enabled: true
    };

    const result = pipe.transform(shelter);

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
    const shelter: ShelterItem = {
      id: 1,
      name: 'Test 1',
      note: 'Note 1',
      personsCount: 10,
      addressStreet: 'Straße',
      addressHouseNumber: '5',
      addressStairway: '',
      addressDoor: '',
      addressPostalCode: 1050,
      addressCity: 'Wien',
      enabled: true
    };

    const result = pipe.transform(shelter);

    expect(result).toBe('Straße 5, 1050 Wien');
  });

  it('should handle whitespace-only stairway and door', () => {
    const shelter: ShelterItem = {
      id: 1,
      name: 'Test 1',
      note: 'Note 1',
      personsCount: 10,
      addressStreet: 'Gasse',
      addressHouseNumber: '3',
      addressStairway: '   ',
      addressDoor: '   ',
      addressPostalCode: 1090,
      addressCity: 'Wien',
      enabled: true
    };

    const result = pipe.transform(shelter);

    expect(result).toBe('Gasse 3, 1090 Wien');
  });
});
