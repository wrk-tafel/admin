import {ALL_CUSTOMER_MERGE_FIELDS, CUSTOMER_MERGE_FIELDS} from './customer-merge-fields';
import {CustomerData, Gender} from '../../../../api/customer-api.service';

describe('customer-merge-fields', () => {

  const customer: CustomerData = {
    id: 100,
    firstname: 'Max',
    lastname: 'Mustermann',
    gender: Gender.MALE,
    address: {street: 'Teststraße', houseNumber: '1', postalCode: 1010, city: 'Wien'},
    telephoneNumber: '111',
    email: 'max@example.com',
    validUntil: new Date(),
    pendingCostContribution: 10,
    singleParent: true,
    country: {id: 1, code: 'AT', name: 'Österreich'},
    employer: 'employer',
    income: 500,
    incomeDue: new Date(),
  };

  it('every field has a label and a working read accessor', () => {
    ALL_CUSTOMER_MERGE_FIELDS.forEach(field => {
      const definition = CUSTOMER_MERGE_FIELDS[field];

      expect(definition.label.length).toBeGreaterThan(0);
      expect(() => definition.read(customer)).not.toThrow();
    });
  });

});
