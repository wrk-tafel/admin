import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {SelectSheltersComponent} from './select-shelters.component';
import {ShelterItem} from '../../../../api/shelter-api.service';
import {MatDialog} from '@angular/material/dialog';
import {of} from 'rxjs';

describe('SelectSheltersComponent', () => {
  let matDialog: MockedObject<MatDialog>;

  beforeEach((() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MatDialog,
          useValue: {
            open: vi.fn().mockName("MatDialog.open")
          }
        }
      ]
    }).compileComponents();

    matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
  }));

  const testShelters: ShelterItem[] = [
    {
      id: 1,
      name: 'Test Shelter 1',
      addressStreet: 'Test Street',
      addressHouseNumber: '1',
      addressStairway: 'A',
      addressDoor: 'B',
      addressPostalCode: 12345,
      addressCity: 'Test City',
      note: 'Test Note',
      personsCount: 100,
      enabled: true
    },
    {
      id: 2,
      name: 'Test Shelter 2',
      addressStreet: 'Test Street',
      addressHouseNumber: '1',
      addressStairway: 'A',
      addressDoor: 'B',
      addressPostalCode: 12345,
      addressCity: 'Test City',
      note: 'Test Note 2',
      personsCount: 200,
      enabled: true
    }
  ];

  it('component can be created', () => {
    const fixture = TestBed.createComponent(SelectSheltersComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('selected shelters from dialog are emitted to output', () => {
    matDialog.open.mockReturnValue({afterClosed: () => of(testShelters)} as any);

    const fixture = TestBed.createComponent(SelectSheltersComponent);
    const componentRef = fixture.componentRef;
    const component = fixture.componentInstance;
    vi.spyOn(component.updateSelectedShelters, 'emit');

    componentRef.setInput('sheltersList', testShelters);
    componentRef.setInput('initialSelectedShelters', [testShelters[1]]);
    fixture.detectChanges();

    component.openSelectSheltersDialog();

    expect(matDialog.open).toHaveBeenCalled();
    expect(component.updateSelectedShelters.emit).toHaveBeenCalledWith(testShelters);
  });

  it('dialog dismissed without selection does not emit', () => {
    matDialog.open.mockReturnValue({afterClosed: () => of(undefined)} as any);

    const fixture = TestBed.createComponent(SelectSheltersComponent);
    const componentRef = fixture.componentRef;
    const component = fixture.componentInstance;
    vi.spyOn(component.updateSelectedShelters, 'emit');

    componentRef.setInput('sheltersList', testShelters);
    componentRef.setInput('initialSelectedShelters', [testShelters[1]]);
    fixture.detectChanges();

    component.openSelectSheltersDialog();

    expect(matDialog.open).toHaveBeenCalled();
    expect(component.updateSelectedShelters.emit).not.toHaveBeenCalled();
  });

});
