import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {SettingsSheltersComponent} from './settings-shelters.component';
import {ToastrService} from 'ngx-toastr';
import {ShelterApiService, ShelterListResponse} from '../../../../api/shelter-api.service';
import {MatDialog} from '@angular/material/dialog';
import {of} from 'rxjs';

describe('SettingsSheltersComponent', () => {

  beforeEach(() => {
    const shelterApiMock: Partial<ShelterApiService> = {
      getAllShelters: () => of<ShelterListResponse>({ shelters: [] })
    };

    const toastrMock: Partial<ToastrService> = {
      success: vi.fn(),
      error: vi.fn()
    };

    const matDialogMock: Partial<MatDialog> = {
      open: vi.fn(() => ({ afterClosed: () => of(undefined) })) as any
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ShelterApiService, useValue: shelterApiMock },
        { provide: ToastrService, useValue: toastrMock },
        { provide: MatDialog, useValue: matDialogMock }
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
    expect(component['shelters']()?.shelters.length).toBe(0);
  });

});
