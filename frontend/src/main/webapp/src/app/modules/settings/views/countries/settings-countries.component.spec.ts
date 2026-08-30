import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {SettingsCountriesComponent} from './settings-countries.component';
import {CountryAdminData, CountryApiService, CountryList} from '../../../../api/country-api.service';
import {of, throwError} from 'rxjs';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('SettingsCountriesComponent', () => {
  const testCountry1: CountryAdminData = {id: 1, code: 'AT', name: 'Österreich', enabled: true};
  const testCountry2: CountryAdminData = {id: 2, code: 'DE', name: 'Deutschland', enabled: true};
  const disabledCountry: CountryAdminData = {id: 3, code: 'XX', name: 'Verschwundenland', enabled: false};

  let countryApiMock: Partial<CountryApiService>;
  let toastrMock: Partial<TafelToastrService>;

  beforeEach(() => {
    countryApiMock = {
      getAllCountries: vi.fn(() => of<CountryList>({items: [testCountry1, testCountry2]})),
      updateCountry: vi.fn(() => of(testCountry1))
    };

    toastrMock = {
      success: vi.fn(),
      error: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: CountryApiService, useValue: countryApiMock},
        {provide: TafelToastrService, useValue: toastrMock}
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

  it('the search box narrows the list by name or code', () => {
    const fixture = TestBed.createComponent(SettingsCountriesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['searchControl'].setValue('deutsch');
    expect(component['visibleCountries']().map(c => c.id)).toEqual([testCountry2.id]);

    component['searchControl'].setValue('at');
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
