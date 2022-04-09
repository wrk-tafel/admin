import { CustomerEditComponent } from './customer-edit.component';

describe('CustomerEditComponent', () => {
  function setup() {
    const service = new CustomerEditComponent();
    return { service };
  }

  it('updateCustomerFormData', () => {
    const { service } = setup();

    expect(service.customerData).toBe(undefined);

    const updatedData = { lastname: 'updated' };
    service.updateCustomerFormData(updatedData);

    expect(service.customerData).toEqual(updatedData);
  });

  it('updatePersonsData', () => {
    const { service } = setup();

    const existingData = { lastname: 'old' };
    service.additionalPersonsData[0] = existingData;
    expect(service.additionalPersonsData[0]).toEqual(existingData);

    const updatedData = { lastname: 'updated' };
    service.updatePersonsData(0, updatedData);

    expect(service.additionalPersonsData[0]).toEqual(updatedData);
  });

  it('addNewPerson', () => {
    const { service } = setup();

    expect(service.additionalPersonsData.length).toBe(0);

    service.addNewPerson();

    expect(service.additionalPersonsData.length).toBe(1);
    expect(service.additionalPersonsData[0].uuid).toBeDefined();
  });

  it('removePerson', () => {
    const { service } = setup();

    const existingData = { lastname: 'old' };
    service.additionalPersonsData[0] = existingData;
    expect(service.additionalPersonsData.length).toBe(1);

    service.removePerson(0);

    expect(service.additionalPersonsData.length).toBe(0);
  });

  it('trackBy', () => {
    const { service } = setup();
    const testUuid = 'test-UUID';

    const trackingId = service.trackBy(0, { uuid: testUuid });

    expect(trackingId).toBe(testUuid);
  });

});
