import {DOCUMENT} from '@angular/common';
import {computed, DestroyRef, effect, inject, Service, signal} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {ThemePreference, UserApiService} from '../../api/user-api.service';

export type EffectiveTheme = 'light' | 'dark';

/** The key `assets/theme-init.js` reads before the first paint - the two have to agree. */
export const THEME_STORAGE_KEY = 'tafel-theme';

/** The one switch the stylesheets hang the dark theme off (`_dark-theme.scss`). */
const DARK_THEME_CLASS = 'dark-theme';

const PREFERENCES: readonly ThemePreference[] = ['LIGHT', 'DARK', 'SYSTEM'];

/**
 * Light or dark, chosen per user. The choice lives on the server so it follows the user to every
 * device ({@link adopt} takes it from the session's user info), and in `localStorage` so the login
 * page and the very first paint of a returning visitor already look right - that copy is only a
 * cache for the device, never the source of truth for a logged-in user.
 *
 * `SYSTEM` (also the default) follows the operating system's setting and keeps following it while
 * the app is open.
 */
@Service()
export class ThemeService {
  private readonly userApiService = inject(UserApiService);
  private readonly document = inject(DOCUMENT);

  private readonly systemDarkQuery = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
  private readonly systemDark = signal(this.systemDarkQuery?.matches ?? false);

  readonly preference = signal<ThemePreference>(this.readStoredPreference());

  readonly effectiveTheme = computed<EffectiveTheme>(() => {
    const preference = this.preference();
    if (preference === 'SYSTEM') {
      return this.systemDark() ? 'dark' : 'light';
    }
    return preference === 'DARK' ? 'dark' : 'light';
  });

  constructor() {
    if (this.systemDarkQuery) {
      const query = this.systemDarkQuery;
      const onChange = (event: MediaQueryListEvent) => this.systemDark.set(event.matches);
      query.addEventListener('change', onChange);
      inject(DestroyRef).onDestroy(() => query.removeEventListener('change', onChange));
    }

    effect(() => {
      const dark = this.effectiveTheme() === 'dark';
      const root = this.document.documentElement;
      root.classList.toggle(DARK_THEME_CLASS, dark);
      root.style.colorScheme = dark ? 'dark' : 'light';
    });
  }

  /** Takes the preference the server holds for the logged-in user; nothing is sent back. */
  adopt(preference: ThemePreference): void {
    this.apply(preference);
  }

  /**
   * Switches at once and saves it for the user. A save that fails puts the previous choice back, so
   * what is on screen is never a preference the server does not have (the error itself is
   * surfaced by the error interceptor).
   */
  async setPreference(preference: ThemePreference): Promise<void> {
    const previous = this.preference();
    this.apply(preference);
    try {
      await firstValueFrom(this.userApiService.updateTheme(preference));
    } catch {
      this.apply(previous);
    }
  }

  private apply(preference: ThemePreference): void {
    this.preference.set(preference);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // storage blocked (private window, site data disabled): the choice still applies for this visit
    }
  }

  private readStoredPreference(): ThemePreference {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      return PREFERENCES.find(preference => preference === stored) ?? 'SYSTEM';
    } catch {
      return 'SYSTEM';
    }
  }
}
