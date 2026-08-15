import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {CdkDragDrop} from '@angular/cdk/drag-drop';
import {SettingsSheltersComponent} from './settings-shelters.component';
import {ShelterApiService, ShelterItem, ShelterListResponse} from '../../../../api/shelter-api.service';
import {MatDialog} from '@angular/material/dialog';
import {of, throwError} from 'rxjs';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {LiveAnnouncer} from '@angular/cdk/a11y';

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
    sortOrder: 1,
    contacts: [{firstname: 'Anna', lastname: 'Smith', phone: '0664 1234567'}]
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
  let liveAnnouncerMock: Partial<LiveAnnouncer>;

  beforeEach(() => {
    shelterApiMock = {
      getAllShelters: vi.fn(() => of<ShelterListResponse>({shelters: [testShelter1, testShelter2]})),
      reorderShelters: vi.fn(() => of<ShelterListResponse>({shelters: [testShelter2, testShelter1]}))
    };

    toastrMock = {
      success: vi.fn(),
      error: vi.fn()
    };

    liveAnnouncerMock = {
      announce: vi.fn(() => Promise.resolve())
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
        {provide: MatDialog, useValue: matDialogMock},
        {provide: LiveAnnouncer, useValue: liveAnnouncerMock}
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(SettingsSheltersComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('loads shelters on init and counts the active ones', () => {
    const fixture = TestBed.createComponent(SettingsSheltersComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component['shelters']().length).toBe(2);
    expect(component['enabledCount']()).toBe(2);
    expect(component['totalCount']()).toBe(2);
  });

  it('keeps the contacts of a record collapsed until its summary is toggled', () => {
    const fixture = TestBed.createComponent(SettingsSheltersComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    // the details stay in the DOM and are collapsed by the region's `hidden`, so the assertion is
    // about that wrapper rather than about the element being absent
    const details = () => fixture.nativeElement.querySelector('[testid="shelter-details-0"]');
    expect(details().closest('[hidden]')).not.toBeNull();

    component['toggleExpanded'](testShelter1.id);
    fixture.detectChanges();

    expect(component['isExpanded'](testShelter1.id)).toBe(true);
    expect(details().closest('[hidden]')).toBeNull();
    expect(details().textContent).toContain('Anna Smith');
  });

  it('renders a contact phone number as a tel: link', () => {
    const fixture = TestBed.createComponent(SettingsSheltersComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['toggleExpanded'](testShelter1.id);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('[testid="shelter-details-0"] a');
    expect(link.getAttribute('href')).toBe('tel:0664 1234567');
    expect(link.textContent).toContain('0664 1234567');
  });

  it('states that a record has no contacts when it has none', () => {
    const fixture = TestBed.createComponent(SettingsSheltersComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['toggleExpanded'](testShelter2.id);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[testid="shelter-details-1"]').textContent)
      .toContain('Keine Kontakte vorhanden');
  });

  it('says that the order is used beyond this screen', () => {
    const fixture = TestBed.createComponent(SettingsSheltersComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[testid="shelters-order-hint"]').textContent)
      .toContain('Dashboard');
  });

  it('drop() reorders optimistically and persists the new order', () => {
    const fixture = TestBed.createComponent(SettingsSheltersComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const event = {previousIndex: 0, currentIndex: 1} as CdkDragDrop<ShelterItem[]>;
    component['drop'](event);

    expect(component['shelters']().map(s => s.id)).toEqual([testShelter2.id, testShelter1.id]);
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

  it('moveShelter() persists the new order and announces the new position', () => {
    const fixture = TestBed.createComponent(SettingsSheltersComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['moveShelter'](0, 1);

    expect(shelterApiMock.reorderShelters).toHaveBeenCalledWith([testShelter2.id, testShelter1.id]);
    expect(liveAnnouncerMock.announce)
      .toHaveBeenCalledWith('Notschlafstelle Shelter 1 ist jetzt an Position 2 von 2.', 'assertive');
  });

  it('moveShelter() past either end of the list changes nothing', () => {
    const fixture = TestBed.createComponent(SettingsSheltersComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['moveShelter'](0, -1);
    component['moveShelter'](1, 1);

    expect(shelterApiMock.reorderShelters).not.toHaveBeenCalled();
    expect(component['shelters']().map(s => s.id)).toEqual([testShelter1.id, testShelter2.id]);
    expect(liveAnnouncerMock.announce).not.toHaveBeenCalled();
  });

  it('toggleShelterVisibility() persists the new enabled state', () => {
    shelterApiMock.updateShelter = vi.fn(() => of(testShelter1));

    const fixture = TestBed.createComponent(SettingsSheltersComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['toggleShelterVisibility'](testShelter1, false);

    expect(shelterApiMock.updateShelter).toHaveBeenCalledWith(testShelter1.id, {...testShelter1, enabled: false});
    expect(toastrMock.success).toHaveBeenCalled();
  });

  it('shows only the shelters matching the status filter', () => {
    const disabledShelter: ShelterItem = {...testShelter2, id: 3, name: 'Shelter 3', enabled: false};
    shelterApiMock.getAllShelters =
      vi.fn(() => of<ShelterListResponse>({shelters: [testShelter1, testShelter2, disabledShelter]}));

    const fixture = TestBed.createComponent(SettingsSheltersComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['visibleShelters']().map(s => s.id)).toEqual([1, 2, 3]);
    expect(component['enabledCount']()).toBe(2);

    component['onFilterChanged']('ENABLED');
    expect(component['visibleShelters']().map(s => s.id)).toEqual([1, 2]);

    component['onFilterChanged']('DISABLED');
    expect(component['visibleShelters']().map(s => s.id)).toEqual([3]);
  });

  it('reorders within the full list when a filter hides shelters in between', () => {
    // enabled, disabled, enabled - so moving the first active one down has to jump the hidden one
    const hiddenShelter: ShelterItem = {...testShelter2, id: 3, name: 'Shelter 3', enabled: false};
    shelterApiMock.getAllShelters =
      vi.fn(() => of<ShelterListResponse>({shelters: [testShelter1, hiddenShelter, testShelter2]}));
    shelterApiMock.reorderShelters =
      vi.fn(() => of<ShelterListResponse>({shelters: [hiddenShelter, testShelter2, testShelter1]}));

    const fixture = TestBed.createComponent(SettingsSheltersComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component['onFilterChanged']('ENABLED');

    component['moveShelter'](0, 1);

    expect(shelterApiMock.reorderShelters)
      .toHaveBeenCalledWith([hiddenShelter.id, testShelter2.id, testShelter1.id]);
    expect(component['visibleShelters']().map(s => s.id)).toEqual([testShelter2.id, testShelter1.id]);
  });

});
