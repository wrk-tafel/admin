import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {SettingsStaticValuesComponent} from './settings-static-values.component';
import {SettingsApiService, StaticValueListResponse} from '../../../../api/settings-api.service';
import {MatDialog} from '@angular/material/dialog';
import {of} from 'rxjs';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('SettingsStaticValuesComponent', () => {

  beforeEach(() => {
    const settingsApiMock: Partial<SettingsApiService> = {
      getStaticValues: () => of<StaticValueListResponse>({staticValues: []})
    };

    const toastrMock: Partial<TafelToastrService> = {
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
        {provide: SettingsApiService, useValue: settingsApiMock},
        {provide: TafelToastrService, useValue: toastrMock},
        {provide: MatDialog, useValue: matDialogMock}
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
    expect(component['staticValues']()?.staticValues.length).toBe(0);
  });

});
