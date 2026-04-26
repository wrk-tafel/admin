import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ShelterEditDialogComponent} from './shelter-edit-dialog.component';
import {ShelterItem} from '../../../../../api/shelter-api.service';

describe('ShelterEditDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<ShelterEditDialogComponent>>;
  const testShelter: ShelterItem = {
    id: 1,
    name: 'Test Shelter',
    addressStreet: 'Street',
    addressHouseNumber: '1',
    addressStairway: 'A',
    addressDoor: 'B',
    addressPostalCode: 12345,
    addressCity: 'City',
    note: 'Note',
    personsCount: 2,
    enabled: true,
    contacts: [{ firstname: 'John', lastname: 'Doe', phone: '123' }]
  };

  beforeEach(async () => {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    await TestBed.configureTestingModule({
      providers: [
        {provide: MatDialogRef, useValue: dialogRef},
        {provide: MAT_DIALOG_DATA, useValue: {shelter: testShelter}}
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(ShelterEditDialogComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('initializes form with provided shelter data including contacts', () => {
    const fixture = TestBed.createComponent(ShelterEditDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.form.value).toMatchObject({
      id: testShelter.id,
      name: testShelter.name,
      addressStreet: testShelter.addressStreet,
      addressHouseNumber: testShelter.addressHouseNumber,
      addressStairway: testShelter.addressStairway,
      addressDoor: testShelter.addressDoor,
      addressPostalCode: testShelter.addressPostalCode,
      addressCity: testShelter.addressCity,
      note: testShelter.note,
      personsCount: testShelter.personsCount,
      enabled: true
    });

    expect(component.contacts.length).toBe(1);
    expect(component.contacts.at(0).value).toMatchObject({ firstname: 'John', lastname: 'Doe', phone: '123' });
  });

  it('can add and remove contacts', () => {
    const fixture = TestBed.createComponent(ShelterEditDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const initial = component.contacts.length;
    component.addContact();
    expect(component.contacts.length).toBe(initial + 1);
    component.removeContact(0);
    expect(component.contacts.length).toBe(initial);
  });

  it('save() closes dialog with form value when valid and includes contacts', () => {
    const fixture = TestBed.createComponent(ShelterEditDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({name: 'Updated', personsCount: 5});
    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith(component.form.value);
    expect(component.form.value.contacts).toBeDefined();
  });

  it('cancel() closes dialog without data', () => {
    const fixture = TestBed.createComponent(ShelterEditDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.cancel();

    expect(dialogRef.close).toHaveBeenCalled();
  });
});
