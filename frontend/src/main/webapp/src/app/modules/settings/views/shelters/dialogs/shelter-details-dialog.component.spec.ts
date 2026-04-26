import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ShelterDetailsDialogComponent} from './shelter-details-dialog.component';
import {ShelterItem} from '../../../../../api/shelter-api.service';

describe('ShelterDetailsDialogComponent', () => {
  let dialogRef: MockedObject<MatDialogRef<ShelterDetailsDialogComponent>>;

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
    contacts: [
      { firstname: 'John', lastname: 'Doe', phone: '012345' }
    ]
  };

  beforeEach(async () => {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close')
    } as any;

    await TestBed.configureTestingModule({
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { shelter: testShelter } }
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(ShelterDetailsDialogComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('renders shelter details', () => {
    const fixture = TestBed.createComponent(ShelterDetailsDialogComponent);
    fixture.detectChanges();
    const native = fixture.nativeElement as HTMLElement;

    expect(native.textContent).toContain('Name:');
    expect(native.textContent).toContain(testShelter.name);
    expect(native.textContent).toContain(testShelter.addressStreet);
    expect(native.textContent).toContain(testShelter.addressHouseNumber);
    expect(native.textContent).toContain(testShelter.addressPostalCode.toString());
    expect(native.textContent).toContain(testShelter.addressCity);
    expect(native.textContent).toContain('Aktiv:');
    expect(native.textContent).toContain('Ja');

    // contacts
    expect(native.textContent).toContain('Kontakte');
    expect(native.textContent).toContain('John Doe');
    expect(native.textContent).toContain('012345');
  });

  it('close() closes dialog', () => {
    const fixture = TestBed.createComponent(ShelterDetailsDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.close();

    expect(dialogRef.close).toHaveBeenCalled();
  });

});
