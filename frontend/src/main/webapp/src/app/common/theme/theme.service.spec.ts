import {TestBed} from '@angular/core/testing';
import {of, throwError} from 'rxjs';
import {THEME_STORAGE_KEY, ThemeService} from './theme.service';
import {UserApiService} from '../../api/user-api.service';

describe('ThemeService', () => {
  let userApiService: { updateTheme: ReturnType<typeof vi.fn> };
  let systemDark: boolean;
  let systemListener: ((event: MediaQueryListEvent) => void) | null;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark-theme');
    document.documentElement.style.colorScheme = '';
    systemDark = false;
    systemListener = null;
    userApiService = {updateTheme: vi.fn().mockReturnValue(of({theme: 'DARK'}))};

    vi.stubGlobal('matchMedia', vi.fn().mockImplementation(() => ({
      get matches() {
        return systemDark;
      },
      addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => systemListener = listener,
      removeEventListener: vi.fn()
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  function createService(): ThemeService {
    TestBed.configureTestingModule({providers: [{provide: UserApiService, useValue: userApiService}]});
    const service = TestBed.inject(ThemeService);
    TestBed.tick();
    return service;
  }

  it('follows the system by default', () => {
    const service = createService();

    expect(service.preference()).toBe('SYSTEM');
    expect(service.effectiveTheme()).toBe('light');
    expect(document.documentElement.classList.contains('dark-theme')).toBe(false);
  });

  it('follows a dark system setting and its later changes', () => {
    systemDark = true;
    const service = createService();
    expect(service.effectiveTheme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark-theme')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');

    systemListener!({matches: false} as MediaQueryListEvent);
    TestBed.tick();

    expect(service.effectiveTheme()).toBe('light');
    expect(document.documentElement.classList.contains('dark-theme')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('ignores the system setting once light or dark is chosen', () => {
    systemDark = true;
    const service = createService();

    service.adopt('LIGHT');
    TestBed.tick();

    expect(service.effectiveTheme()).toBe('light');
    expect(document.documentElement.classList.contains('dark-theme')).toBe(false);
  });

  it('starts from the choice this device stored', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'DARK');

    const service = createService();

    expect(service.preference()).toBe('DARK');
    expect(document.documentElement.classList.contains('dark-theme')).toBe(true);
  });

  it('ignores a stored value it does not know', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'PURPLE');

    expect(createService().preference()).toBe('SYSTEM');
  });

  it('adopting the server preference applies and stores it without a request', () => {
    const service = createService();

    service.adopt('DARK');
    TestBed.tick();

    expect(service.effectiveTheme()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('DARK');
    expect(userApiService.updateTheme).not.toHaveBeenCalled();
  });

  it('switches at once and saves the choice', async () => {
    const service = createService();

    await service.setPreference('DARK');
    TestBed.tick();

    expect(userApiService.updateTheme).toHaveBeenCalledWith('DARK');
    expect(service.preference()).toBe('DARK');
    expect(document.documentElement.classList.contains('dark-theme')).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('DARK');
  });

  it('puts the previous choice back when saving fails', async () => {
    const service = createService();
    service.adopt('LIGHT');
    userApiService.updateTheme.mockReturnValue(throwError(() => new Error('boom')));

    await service.setPreference('DARK');
    TestBed.tick();

    expect(service.preference()).toBe('LIGHT');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('LIGHT');
    expect(document.documentElement.classList.contains('dark-theme')).toBe(false);
  });

  it('still applies a choice when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const service = createService();

    service.adopt('DARK');

    expect(service.preference()).toBe('DARK');
  });
});
