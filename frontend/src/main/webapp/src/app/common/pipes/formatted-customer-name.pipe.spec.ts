import {FormattedCustomerNamePipe} from './formatted-customer-name.pipe';
import {CustomerData} from '../../api/customer-api.service';

describe('FormattedCustomerNamePipe', () => {
  let pipe: FormattedCustomerNamePipe;

  beforeEach(() => {
    pipe = new FormattedCustomerNamePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should format customer with both firstname and lastname', () => {
    const customer: Partial<CustomerData> = {
      firstname: 'Max',
      lastname: 'Mustermann'
    };

    const result = pipe.transform(customer as CustomerData);

    expect(result).toBe('Mustermann Max');
  });

  it('should format customer with only lastname', () => {
    const customer: Partial<CustomerData> = {
      lastname: 'Mustermann'
    };

    const result = pipe.transform(customer as CustomerData);

    expect(result).toBe('Mustermann');
  });

  it('should format customer with only firstname', () => {
    const customer: Partial<CustomerData> = {
      firstname: 'Max'
    };

    const result = pipe.transform(customer as CustomerData);

    expect(result).toBe('Max');
  });

  it('should return dash for customer with no name fields', () => {
    const customer: Partial<CustomerData> = {};

    const result = pipe.transform(customer as CustomerData);

    expect(result).toBe('-');
  });

  it('should return dash for customer with empty name fields', () => {
    const customer: Partial<CustomerData> = {
      firstname: '',
      lastname: ''
    };

    const result = pipe.transform(customer as CustomerData);

    expect(result).toBe('-');
  });

  it('should return dash for undefined customer', () => {
    const result = pipe.transform(undefined);

    expect(result).toBe('-');
  });

  it('should return dash for null customer', () => {
    const result = pipe.transform(null);

    expect(result).toBe('-');
  });

  it('should handle whitespace-only names', () => {
    const customer: Partial<CustomerData> = {
      firstname: '   ',
      lastname: '  '
    };

    const result = pipe.transform(customer as CustomerData);

    expect(result).toBe('-');
  });

  it('should not trim individual name parts but joins them', () => {
    const customer: Partial<CustomerData> = {
      firstname: '  Max  ',
      lastname: '  Mustermann  '
    };

    const result = pipe.transform(customer as CustomerData);

    expect(result).toBe('Mustermann Max');
  });
});
