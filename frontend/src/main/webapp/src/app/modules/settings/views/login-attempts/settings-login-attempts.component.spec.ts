import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {SettingsLoginAttemptsComponent} from './settings-login-attempts.component';
import {LoginAttemptItem, SettingsApiService} from '../../../../api/settings-api.service';
import {PagedResponse} from '../../../../common/api/paged-response';
import {MatDialog} from '@angular/material/dialog';
import {of, throwError} from 'rxjs';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('SettingsLoginAttemptsComponent', () => {
  const lockedLoginAttempt: LoginAttemptItem = {
    id: 1,
    username: 'gesperrt1',
    failureCount: 5,
    lastFailureAt: '2026-01-01T10:00:00',
    lockedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  };
  const notLockedLoginAttempt: LoginAttemptItem = {
    id: 2,
    username: 'fehlversuch1',
    failureCount: 2,
    lastFailureAt: '2026-01-01T09:00:00',
    lockedUntil: null
  };
  const pagedResponse: PagedResponse<LoginAttemptItem> = {
    items: [lockedLoginAttempt, notLockedLoginAttempt],
    totalCount: 2,
    currentPage: 1,
    totalPages: 1,
    pageSize: 10
  };

  let settingsApiMock: Partial<SettingsApiService>;
  let toastrMock: Partial<TafelToastrService>;
  let matDialogMock: Partial<MatDialog>;

  beforeEach(() => {
    settingsApiMock = {
      getLoginAttempts: vi.fn(() => of<PagedResponse<LoginAttemptItem>>(pagedResponse)),
      deleteLoginAttempt: vi.fn(() => of(undefined))
    };

    toastrMock = {
      success: vi.fn(),
      error: vi.fn()
    };

    matDialogMock = {
      open: vi.fn(() => ({afterClosed: () => of(true)})) as any
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
    const fixture = TestBed.createComponent(SettingsLoginAttemptsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('loads login attempts on init', () => {
    const fixture = TestBed.createComponent(SettingsLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component['loginAttempts']()?.items.length).toBe(2);
    expect(settingsApiMock.getLoginAttempts).toHaveBeenCalledWith(undefined, undefined);
  });

  it('loadLoginAttempts() requests the given page and page size', () => {
    const fixture = TestBed.createComponent(SettingsLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['loadLoginAttempts'](2, 25);

    expect(settingsApiMock.getLoginAttempts).toHaveBeenCalledWith(2, 25);
  });

  it('shows an error toast when loading fails', () => {
    settingsApiMock.getLoginAttempts = vi.fn(() => throwError(() => new Error('failed')));

    const fixture = TestBed.createComponent(SettingsLoginAttemptsComponent);
    fixture.detectChanges();

    expect(toastrMock.error).toHaveBeenCalled();
  });

  it('isLocked() is true for an entry with a lockedUntil in the future', () => {
    const fixture = TestBed.createComponent(SettingsLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['isLocked'](lockedLoginAttempt)).toBe(true);
  });

  it('isLocked() is false for an entry without a lockedUntil', () => {
    const fixture = TestBed.createComponent(SettingsLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['isLocked'](notLockedLoginAttempt)).toBe(false);
  });

  it('isLocked() is false once lockedUntil is in the past', () => {
    const fixture = TestBed.createComponent(SettingsLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['isLocked']({...lockedLoginAttempt, lockedUntil: new Date(Date.now() - 1000).toISOString()})).toBe(false);
  });

  it('deleteLoginAttempt() deletes after confirmation, shows a success toast and reloads the current page', () => {
    const fixture = TestBed.createComponent(SettingsLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['deleteLoginAttempt'](lockedLoginAttempt);

    expect(settingsApiMock.deleteLoginAttempt).toHaveBeenCalledWith(lockedLoginAttempt.id);
    expect(toastrMock.success).toHaveBeenCalled();
    expect(settingsApiMock.getLoginAttempts).toHaveBeenCalledWith(pagedResponse.currentPage, pagedResponse.pageSize);
  });

  it('deleteLoginAttempt() does nothing when the dialog is cancelled', () => {
    matDialogMock.open = vi.fn(() => ({afterClosed: () => of(undefined)})) as any;

    const fixture = TestBed.createComponent(SettingsLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['deleteLoginAttempt'](lockedLoginAttempt);

    expect(settingsApiMock.deleteLoginAttempt).not.toHaveBeenCalled();
  });

  it('deleteLoginAttempt() shows an error toast when deletion fails', () => {
    settingsApiMock.deleteLoginAttempt = vi.fn(() => throwError(() => new Error('failed')));

    const fixture = TestBed.createComponent(SettingsLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['deleteLoginAttempt'](lockedLoginAttempt);

    expect(toastrMock.error).toHaveBeenCalled();
  });

});
