import {ALL_CUSTOMER_MERGE_FIELDS, CUSTOMER_MERGE_FIELDS} from './customer-merge-fields';
import {CustomerData, Gender, HouseholdLockReason} from '../../../../api/customer-api.service';

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
    country: {id: 1, name: 'Österreich'},
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

  it('LOCK_STATE describes a temporary lock with its category and free-text reason', () => {
    const lockedCustomer: CustomerData = {
      ...customer,
      locked: true,
      lockReasonType: HouseholdLockReason.BANNED_FROM_PREMISES,
      lockReason: 'lorem ipsum',
      lockedUntil: '2027-01-15'
    };

    expect(CUSTOMER_MERGE_FIELDS.LOCK_STATE.read(lockedCustomer))
      .toBe('Gesperrt (Hausverbot: lorem ipsum) (befristet bis 15.01.2027)');
  });

  it('LOCK_STATE describes a permanent lock with no category', () => {
    const lockedCustomer: CustomerData = {
      ...customer,
      locked: true,
      lockReason: 'lorem ipsum'
    };

    expect(CUSTOMER_MERGE_FIELDS.LOCK_STATE.read(lockedCustomer)).toBe('Gesperrt (lorem ipsum)');
  });

});
