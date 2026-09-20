import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {HttpErrorResponse} from '@angular/common/http';
import {MatDialog} from '@angular/material/dialog';
import {SettingsCountriesComponent} from './settings-countries.component';
import {CountryAdminData, CountryApiService, CountryCreateData, CountryList} from '../../../../api/country-api.service';
import {of, throwError} from 'rxjs';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('SettingsCountriesComponent', () => {
  const testCountry1: CountryAdminData = {id: 1, name: 'Österreich', enabled: true};
  const testCountry2: CountryAdminData = {id: 2, name: 'Deutschland', enabled: true};
  const disabledCountry: CountryAdminData = {id: 3, name: 'Verschwundenland', enabled: false};

  let countryApiMock: Partial<CountryApiService>;
  let toastrMock: Partial<TafelToastrService>;

  let matDialogMock: Partial<MatDialog>;

  beforeEach(() => {
    countryApiMock = {
      getAllCountries: vi.fn(() => of<CountryList>({items: [testCountry1, testCountry2]})),
      updateCountry: vi.fn(() => of(testCountry1)),
      createCountry: vi.fn(() => of(testCountry1))
    };

    toastrMock = {
      success: vi.fn(),
      error: vi.fn()
    };

    matDialogMock = {
      open: vi.fn(() => ({afterClosed: () => of(undefined)})) as any
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: CountryApiService, useValue: countryApiMock},
        {provide: TafelToastrService, useValue: toastrMock},
        {provide: MatDialog, useValue: matDialogMock}
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(SettingsCountriesComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads countries on init, sorted alphabetically', () => {
    countryApiMock.getAllCountries = vi.fn(() => of<CountryList>({items: [testCountry2, testCountry1]}));

    const fixture = TestBed.createComponent(SettingsCountriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['visibleCountries']().map(c => c.id)).toEqual([testCountry2.id, testCountry1.id]);
  });

  it('startEdit() enters edit mode for the given row and prefills the name', () => {
    const fixture = TestBed.createComponent(SettingsCountriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testCountry1);

    expect(component['editingId']()).toBe(testCountry1.id);
    expect(component['nameControl'].value).toBe(testCountry1.name);
  });

  it('cancelEdit() leaves edit mode without saving', () => {
    const fixture = TestBed.createComponent(SettingsCountriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testCountry1);
    component['cancelEdit']();

    expect(component['editingId']()).toBeNull();
    expect(countryApiMock.updateCountry).not.toHaveBeenCalled();
  });

  it('saveEdit() sends the trimmed name, shows a success toast and reloads', () => {
    const fixture = TestBed.createComponent(SettingsCountriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testCountry1);
    component['nameControl'].setValue(' Updated Name ');
    component['saveEdit'](testCountry1);

    expect(countryApiMock.updateCountry).toHaveBeenCalledWith(testCountry1.id, {
      ...testCountry1,
      name: 'Updated Name'
    });
    expect(toastrMock.success).toHaveBeenCalled();
    expect(component['editingId']()).toBeNull();
  });

  it('saveEdit() refuses a blank name', () => {
    const fixture = TestBed.createComponent(SettingsCountriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testCountry1);
    component['nameControl'].setValue('   ');
    component['saveEdit'](testCountry1);

    expect(countryApiMock.updateCountry).not.toHaveBeenCalled();
    expect(component['nameControl'].touched).toBe(true);
    expect(component['editingId']()).toBe(testCountry1.id);
  });

  it('saveEdit() surfaces the backend error message (e.g. a duplicate name) in the toast', () => {
    countryApiMock.updateCountry = vi.fn(() => throwError(() =>
      new HttpErrorResponse({status: 400, error: {detail: 'Das Land Deutschland existiert bereits!'}})
    ));

    const fixture = TestBed.createComponent(SettingsCountriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testCountry1);
    component['saveEdit'](testCountry1);

    expect(toastrMock.error).toHaveBeenCalledWith('Das Land Deutschland existiert bereits!', 'Speichern fehlgeschlagen');
  });

  it('addCountry() creates the country returned by the dialog, shows a success toast and reloads', () => {
    const created: CountryCreateData = {name: 'Neuland', enabled: true};
    matDialogMock.open = vi.fn(() => ({afterClosed: () => of(created)})) as any;

    const fixture = TestBed.createComponent(SettingsCountriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['addCountry']();

    expect(countryApiMock.createCountry).toHaveBeenCalledWith(created);
    expect(toastrMock.success).toHaveBeenCalled();
  });

  it('addCountry() does nothing when the dialog is cancelled', () => {
    const fixture = TestBed.createComponent(SettingsCountriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['addCountry']();

    expect(countryApiMock.createCountry).not.toHaveBeenCalled();
  });

  it('addCountry() surfaces the backend error message (e.g. a duplicate name) in the toast', () => {
    const created: CountryCreateData = {name: 'Österreich', enabled: true};
    matDialogMock.open = vi.fn(() => ({afterClosed: () => of(created)})) as any;
    countryApiMock.createCountry = vi.fn(() => throwError(() =>
      new HttpErrorResponse({status: 400, error: {detail: 'Das Land Österreich existiert bereits!'}})
    ));

    const fixture = TestBed.createComponent(SettingsCountriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['addCountry']();

    expect(toastrMock.error).toHaveBeenCalledWith('Das Land Österreich existiert bereits!', 'Erstellen fehlgeschlagen');
  });

  it('toggleCountryVisibility() updates the enabled flag', () => {
    const fixture = TestBed.createComponent(SettingsCountriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['toggleCountryVisibility'](testCountry1, false);

    expect(countryApiMock.updateCountry).toHaveBeenCalledWith(testCountry1.id, {
      ...testCountry1,
      enabled: false
    });
    expect(toastrMock.success).toHaveBeenCalled();
  });

  it('the status filter narrows the list to the active or the deactivated countries', () => {
    countryApiMock.getAllCountries = vi.fn(() => of<CountryList>({items: [testCountry1, disabledCountry, testCountry2]}));

    const fixture = TestBed.createComponent(SettingsCountriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['enabledCount']()).toBe(2);
    expect(component['totalCount']()).toBe(3);

    component['onFilterChanged']('ENABLED');
    expect(component['visibleCountries']().map(c => c.id)).toEqual([testCountry2.id, testCountry1.id]);

    component['onFilterChanged']('DISABLED');
    expect(component['visibleCountries']().map(c => c.id)).toEqual([disabledCountry.id]);
  });

  it('the search box narrows the list by name', () => {
    const fixture = TestBed.createComponent(SettingsCountriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['searchControl'].setValue('deutsch');
    expect(component['visibleCountries']().map(c => c.id)).toEqual([testCountry2.id]);

    component['searchControl'].setValue('reich');
    expect(component['visibleCountries']().map(c => c.id)).toEqual([testCountry1.id]);
  });

  it('clearSearch() resets the search field', () => {
    const fixture = TestBed.createComponent(SettingsCountriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['searchControl'].setValue('deutsch');
    component['clearSearch']();

    expect(component['searchControl'].value).toBe('');
  });

  it('an error while loading shows an error toast', () => {
    countryApiMock.getAllCountries = vi.fn(() => throwError(() => new Error('failed')));

    const fixture = TestBed.createComponent(SettingsCountriesComponent);
    fixture.detectChanges();

    expect(toastrMock.error).toHaveBeenCalled();
  });
});
