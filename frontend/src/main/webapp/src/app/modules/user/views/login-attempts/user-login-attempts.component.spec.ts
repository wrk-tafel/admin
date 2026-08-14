import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {UserLoginAttemptsComponent} from './user-login-attempts.component';
import {LoginAttemptItem, LoginAttemptSettingsResponse, UserApiService} from '../../../../api/user-api.service';
import {PagedResponse} from '../../../../common/api/paged-response';
import {MatDialog} from '@angular/material/dialog';
import {of, throwError} from 'rxjs';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('UserLoginAttemptsComponent', () => {
  const lockedLoginAttempt: LoginAttemptItem = {
    id: 1,
    username: 'gesperrt1',
    failureCount: 5,
    lastFailureAt: '2026-01-01T10:00:00',
    lockedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    userId: 42
  };
  const notLockedLoginAttempt: LoginAttemptItem = {
    id: 2,
    username: 'fehlversuch1',
    failureCount: 2,
    lastFailureAt: '2026-01-01T09:00:00',
    lockedUntil: null,
    userId: null
  };
  const pagedResponse: PagedResponse<LoginAttemptItem> = {
    items: [lockedLoginAttempt, notLockedLoginAttempt],
    totalCount: 2,
    currentPage: 1,
    totalPages: 1,
    pageSize: 10
  };
  const settings: LoginAttemptSettingsResponse = {maxFailures: 5, lockoutDurationInSeconds: 900};

  let userApiMock: Partial<UserApiService>;
  let toastrMock: Partial<TafelToastrService>;
  let matDialogMock: Partial<MatDialog>;

  beforeEach(() => {
    userApiMock = {
      getLoginAttempts: vi.fn(() => of<PagedResponse<LoginAttemptItem>>(pagedResponse)),
      getLoginAttemptSettings: vi.fn(() => of<LoginAttemptSettingsResponse>(settings)),
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
        provideRouter([]),
        {provide: UserApiService, useValue: userApiMock},
        {provide: TafelToastrService, useValue: toastrMock},
        {provide: MatDialog, useValue: matDialogMock}
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(UserLoginAttemptsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('loads login attempts and the lockout rule on init', () => {
    const fixture = TestBed.createComponent(UserLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['loginAttempts']()?.items.length).toBe(2);
    expect(component['settings']()).toEqual(settings);
    expect(userApiMock.getLoginAttempts).toHaveBeenCalledWith(undefined, undefined, '', false);
  });

  it('states the configured lockout rule', () => {
    const fixture = TestBed.createComponent(UserLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['lockoutRuleText']()).toBe('Sperre nach 5 Fehlversuchen für 15 Minuten.');
  });

  it('states no lockout rule while the settings are unavailable', () => {
    userApiMock.getLoginAttemptSettings = vi.fn(() => throwError(() => new Error('failed')));

    const fixture = TestBed.createComponent(UserLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['lockoutRuleText']()).toBeNull();
    // the list's own error toast is the only one worth showing - the rule failing is silent
    expect(toastrMock.error).not.toHaveBeenCalled();
  });

  it('loadLoginAttempts() requests the given page and page size', () => {
    const fixture = TestBed.createComponent(UserLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['loadLoginAttempts'](2, 25);

    expect(userApiMock.getLoginAttempts).toHaveBeenCalledWith(2, 25, '', false);
  });

  it('searches by username and starts over at the first page', async () => {
    const fixture = TestBed.createComponent(UserLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['searchControl'].setValue('  hans  ');
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(userApiMock.getLoginAttempts).toHaveBeenCalledWith(1, 10, 'hans', false);
  });

  it('the locked-only filter starts over at the first page', () => {
    const fixture = TestBed.createComponent(UserLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['onStatusFilterChanged']({value: 'LOCKED'} as any);

    expect(component['statusFilter']()).toBe('LOCKED');
    expect(userApiMock.getLoginAttempts).toHaveBeenCalledWith(1, 10, '', true);
  });

  it('refresh() reloads the page currently shown', () => {
    const fixture = TestBed.createComponent(UserLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['refresh']();

    expect(userApiMock.getLoginAttempts).toHaveBeenCalledWith(1, 10, '', false);
    expect(component['lastUpdatedAt']()).not.toBeNull();
  });

  it('shows an error toast when loading fails', () => {
    userApiMock.getLoginAttempts = vi.fn(() => throwError(() => new Error('failed')));

    const fixture = TestBed.createComponent(UserLoginAttemptsComponent);
    fixture.detectChanges();

    expect(toastrMock.error).toHaveBeenCalled();
  });

  it('a locked entry carries the lock state and the time left', () => {
    const fixture = TestBed.createComponent(UserLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const row = component['rows']()[0];
    expect(row.locked).toBe(true);
    expect(row.remainingLockText).toBe('noch 15 Min.');
  });

  it('an entry without a lock carries no remaining time', () => {
    const fixture = TestBed.createComponent(UserLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const row = component['rows']()[1];
    expect(row.locked).toBe(false);
    expect(row.remainingLockText).toBeNull();
  });

  it('an entry whose lock has run out is no longer locked', () => {
    userApiMock.getLoginAttempts = vi.fn(() => of<PagedResponse<LoginAttemptItem>>({
      ...pagedResponse,
      items: [{...lockedLoginAttempt, lockedUntil: new Date(Date.now() - 1000).toISOString()}]
    }));

    const fixture = TestBed.createComponent(UserLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['rows']()[0].locked).toBe(false);
  });

  it('a lock lasting longer than a day is counted in days and dated', () => {
    userApiMock.getLoginAttempts = vi.fn(() => of<PagedResponse<LoginAttemptItem>>({
      ...pagedResponse,
      items: [{...lockedLoginAttempt, lockedUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()}]
    }));

    const fixture = TestBed.createComponent(UserLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['rows']()[0].remainingLockText).toBe('noch 3 Tage');
    expect(component['rows']()[0].lockedUntilFormat).toBe('dd.MM.yyyy HH:mm');
  });

  it('unlock() lifts the lock right away, without a confirmation', () => {
    const fixture = TestBed.createComponent(UserLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['unlock'](component['rows']()[0]);

    expect(matDialogMock.open).not.toHaveBeenCalled();
    expect(userApiMock.deleteLoginAttempt).toHaveBeenCalledWith(lockedLoginAttempt.id);
    expect(toastrMock.success).toHaveBeenCalledWith('Sperre für gesperrt1 aufgehoben', 'Erfolgreich');
    expect(userApiMock.getLoginAttempts).toHaveBeenCalledWith(pagedResponse.currentPage, pagedResponse.pageSize, '', false);
  });

  it('resetLoginAttempt() deletes after confirmation and reloads the current page', () => {
    const fixture = TestBed.createComponent(UserLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['resetLoginAttempt'](component['rows']()[1]);

    expect(matDialogMock.open).toHaveBeenCalled();
    expect(userApiMock.deleteLoginAttempt).toHaveBeenCalledWith(notLockedLoginAttempt.id);
    expect(toastrMock.success).toHaveBeenCalledWith('Fehlversuche für fehlversuch1 zurückgesetzt', 'Erfolgreich');
    expect(userApiMock.getLoginAttempts).toHaveBeenCalledWith(pagedResponse.currentPage, pagedResponse.pageSize, '', false);
  });

  it('resetLoginAttempt() does nothing when the dialog is cancelled', () => {
    matDialogMock.open = vi.fn(() => ({afterClosed: () => of(undefined)})) as any;

    const fixture = TestBed.createComponent(UserLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['resetLoginAttempt'](component['rows']()[1]);

    expect(userApiMock.deleteLoginAttempt).not.toHaveBeenCalled();
  });

  it('shows an error toast when deletion fails', () => {
    userApiMock.deleteLoginAttempt = vi.fn(() => throwError(() => new Error('failed')));

    const fixture = TestBed.createComponent(UserLoginAttemptsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['unlock'](component['rows']()[0]);

    expect(toastrMock.error).toHaveBeenCalled();
  });

});
