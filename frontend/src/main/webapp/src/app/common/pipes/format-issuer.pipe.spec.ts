import {FormatIssuerPipe} from './format-issuer.pipe';
import {CustomerIssuer} from '../../api/customer-api.service';

describe('FormatIssuerPipe', () => {
  let pipe: FormatIssuerPipe;

  beforeEach(() => {
    pipe = new FormatIssuerPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should format issuer with all fields', () => {
    const issuer: CustomerIssuer = {
      personnelNumber: 'PN123',
      firstname: 'Max',
      lastname: 'Mustermann'
    };

    const result = pipe.transform(issuer);

    expect(result).toBe('von PN123 Max Mustermann');
  });

  it('should format issuer with different personnel number', () => {
    const issuer: CustomerIssuer = {
      personnelNumber: 'EMP456',
      firstname: 'Anna',
      lastname: 'Schmidt'
    };

    const result = pipe.transform(issuer);

    expect(result).toBe('von EMP456 Anna Schmidt');
  });

  it('should return empty string for undefined issuer', () => {
    const result = pipe.transform(undefined);

    expect(result).toBe('');
  });

  it('should return empty string for null issuer', () => {
    const result = pipe.transform(null);

    expect(result).toBe('');
  });
});
