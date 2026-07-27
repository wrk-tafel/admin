import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {SettingsStaticValuesComponent} from './settings-static-values.component';
import {SettingsApiService, StaticValueItem, StaticValueListResponse, StaticValueTypeEnum} from '../../../../api/settings-api.service';
import {of} from 'rxjs';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('SettingsStaticValuesComponent', () => {
  const testStaticValue: StaticValueItem = {
    id: 1,
    type: StaticValueTypeEnum.TOLERANCE,
    validFrom: '2026-01-01',
    validTo: '2999-12-31',
    amount: 100,
    countAdults: null,
    countChildren: null,
    age: null
  };

  let settingsApiMock: Partial<SettingsApiService>;
  let toastrMock: Partial<TafelToastrService>;

  beforeEach(() => {
    settingsApiMock = {
      getStaticValues: vi.fn(() => of<StaticValueListResponse>({staticValues: [testStaticValue]})),
      updateStaticValue: vi.fn(() => of(testStaticValue))
    };

    toastrMock = {
      success: vi.fn(),
      error: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: SettingsApiService, useValue: settingsApiMock},
        {provide: TafelToastrService, useValue: toastrMock}
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(SettingsStaticValuesComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('loads static values on init', () => {
    const fixture = TestBed.createComponent(SettingsStaticValuesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component['staticValues']()).toBeDefined();
    expect(component['staticValues']()?.staticValues.length).toBe(1);
  });

  it('startEdit() enters edit mode for the given row and prefills the amount', () => {
    const fixture = TestBed.createComponent(SettingsStaticValuesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testStaticValue);

    expect(component['editingId']()).toBe(testStaticValue.id);
    expect(component['amountControl'].value).toBe(testStaticValue.amount);
  });

  it('cancelEdit() leaves edit mode without saving', () => {
    const fixture = TestBed.createComponent(SettingsStaticValuesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testStaticValue);
    component['cancelEdit']();

    expect(component['editingId']()).toBeNull();
    expect(settingsApiMock.updateStaticValue).not.toHaveBeenCalled();
  });

  it('saveEdit() sends the changed amount, shows a success toast and reloads', () => {
    const fixture = TestBed.createComponent(SettingsStaticValuesComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['startEdit'](testStaticValue);
    component['amountControl'].setValue(200);
    component['saveEdit'](testStaticValue);

    expect(settingsApiMock.updateStaticValue).toHaveBeenCalledWith(testStaticValue.id, {
      ...testStaticValue,
      amount: 200
    });
    expect(toastrMock.success).toHaveBeenCalled();
    expect(component['editingId']()).toBeNull();
  });

});
