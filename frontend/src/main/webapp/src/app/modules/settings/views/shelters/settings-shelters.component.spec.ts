import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {CdkDragDrop} from '@angular/cdk/drag-drop';
import {SettingsSheltersComponent} from './settings-shelters.component';
import {ShelterApiService, ShelterItem, ShelterListResponse} from '../../../../api/shelter-api.service';
import {MatDialog} from '@angular/material/dialog';
import {of, throwError} from 'rxjs';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('SettingsSheltersComponent', () => {
  const testShelter1: ShelterItem = {
    id: 1,
    name: 'Shelter 1',
    addressStreet: 'Street',
    addressHouseNumber: '1',
    addressPostalCode: 1234,
    addressCity: 'City 1',
    note: 'Note 1',
    personsCount: 1,
    enabled: true,
    sortOrder: 1
  };
  const testShelter2: ShelterItem = {
    id: 2,
    name: 'Shelter 2',
    addressStreet: 'Street',
    addressHouseNumber: '2',
    addressPostalCode: 4321,
    addressCity: 'City 2',
    note: 'Note 2',
    personsCount: 2,
    enabled: true,
    sortOrder: 2
  };

  let shelterApiMock: Partial<ShelterApiService>;
  let toastrMock: Partial<TafelToastrService>;

  beforeEach(() => {
    shelterApiMock = {
      getAllShelters: vi.fn(() => of<ShelterListResponse>({shelters: [testShelter1, testShelter2]})),
      reorderShelters: vi.fn(() => of<ShelterListResponse>({shelters: [testShelter2, testShelter1]}))
    };

    toastrMock = {
      success: vi.fn(),
      error: vi.fn()
    };

    const matDialogMock: Partial<MatDialog> = {
      open: vi.fn(() => ({afterClosed: () => of(undefined)})) as any
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: ShelterApiService, useValue: shelterApiMock},
        {provide: TafelToastrService, useValue: toastrMock},
        {provide: MatDialog, useValue: matDialogMock}
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(SettingsSheltersComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('loads shelters on init', () => {
    const fixture = TestBed.createComponent(SettingsSheltersComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component['shelters']()).toBeDefined();
    expect(component['shelters']()?.shelters.length).toBe(2);
  });

  it('drop() reorders optimistically and persists the new order', () => {
    const fixture = TestBed.createComponent(SettingsSheltersComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const event = {previousIndex: 0, currentIndex: 1} as CdkDragDrop<ShelterItem[]>;
    component['drop'](event);

    expect(component['shelters']()?.shelters.map(s => s.id)).toEqual([testShelter2.id, testShelter1.id]);
    expect(shelterApiMock.reorderShelters).toHaveBeenCalledWith([testShelter2.id, testShelter1.id]);
  });

  it('drop() reverts and shows an error toast when persisting fails', () => {
    shelterApiMock.reorderShelters = vi.fn(() => throwError(() => new Error('failed')));

    const fixture = TestBed.createComponent(SettingsSheltersComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const event = {previousIndex: 0, currentIndex: 1} as CdkDragDrop<ShelterItem[]>;
    component['drop'](event);

    expect(toastrMock.error).toHaveBeenCalled();
    expect(shelterApiMock.getAllShelters).toHaveBeenCalledTimes(2);
  });

});
