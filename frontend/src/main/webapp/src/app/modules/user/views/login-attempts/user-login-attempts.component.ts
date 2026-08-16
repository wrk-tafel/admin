import {Component, computed, DestroyRef, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MatDialog} from '@angular/material/dialog';
import {MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable
} from '@angular/material/table';
import {MatPaginatorModule} from '@angular/material/paginator';
import {DatePipe} from '@angular/common';
import {debounceTime, distinctUntilChanged, map} from 'rxjs';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {LoginAttemptItem, LoginAttemptSettingsResponse, UserApiService} from '../../../../api/user-api.service';
import {PagedResponse, PAGE_SIZE_OPTIONS} from '../../../../common/api/paged-response';
import {MatIcon} from '@angular/material/icon';
import {MatButton} from '@angular/material/button';
import {MatButtonToggleChange, MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatTooltipModule} from '@angular/material/tooltip';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {ResetLoginAttemptDialogComponent} from './dialogs/reset-login-attempt-dialog.component';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import syncIcon from '@material-symbols/svg-400/outlined/sync-fill.svg';
import lockOpenIcon from '@material-symbols/svg-400/outlined/lock_open-fill.svg';
import shieldPersonIcon from '@material-symbols/svg-400/outlined/shield_person-fill.svg';

/** Long enough not to search on every keystroke of a username, short enough to feel immediate. */
const SEARCH_DEBOUNCE_MS = 400;

/**
 * How often the remaining lock time is recomputed. A lock lasts minutes, so the countdown is
 * written in minutes - half a minute keeps it from ever being more than one minute stale, and an
 * expired lock turns into an unlocked row without anyone pressing anything.
 */
const LOCK_TICK_MS = 30_000;

/** Which attempts the status filter lets through. */
export type LoginAttemptFilter = 'ALL' | 'LOCKED';

/** One attempt as the screen shows it: the record plus the lock state at this moment. */
export interface LoginAttemptRow extends LoginAttemptItem {
  locked: boolean;
  /** How much of the lock is left, e.g. "noch 12 Min." - null for an attempt that isn't locked. */
  remainingLockText: string | null;
  /** Time alone for a lock that ends today, which every lock does that anybody is waiting on. */
  lockedUntilFormat: string;
}

/**
 * Failed-login administration.
 *
 * What the screen is opened for is almost always one thing: a colleague is locked out and needs to
 * get back in. It is built around that - currently locked entries come first, the username is
 * searchable, and the lock's remaining time is spelled out, since waiting it out is the alternative
 * to lifting it. Lifting the lock happens on one click; a confirmation is left for an entry that is
 * not locked, where deleting it changes nothing anyone is waiting for.
 */
@Component({
  selector: 'tafel-user-login-attempts',
  templateUrl: 'user-login-attempts.component.html',
  imports: [
    MatCard,
    MatCardActions,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow,
    MatRowDef,
    MatTable,
    MatHeaderCellDef,
    MatPaginatorModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    DatePipe,
    MatIcon,
    MatButton,
    MatTooltipModule,
    RouterLink
  ]
})
export class UserLoginAttemptsComponent {
  private readonly registerIcons = registerSvgIcons({sync: syncIcon, lock_open: lockOpenIcon, shield_person: shieldPersonIcon});

  private readonly userApiService = inject(UserApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  private _loginAttempts = signal<PagedResponse<LoginAttemptItem> | null>(null);
  protected loginAttempts = this._loginAttempts;
  displayedColumns = ['username', 'failureCount', 'lastFailureAt', 'lockedUntil', 'actions'];

  protected searchControl = new FormControl<string>('', {nonNullable: true});
  protected readonly statusFilter = signal<LoginAttemptFilter>('ALL');
  protected readonly settings = signal<LoginAttemptSettingsResponse | null>(null);
  protected readonly lastUpdatedAt = signal<Date | null>(null);

  /** Moves on its own, so the remaining lock time stays right without a reload. */
  private readonly now = signal(Date.now());

  protected readonly rows = computed<LoginAttemptRow[]>(() => {
    const now = this.now();
    return (this._loginAttempts()?.items ?? []).map(attempt => {
      const lockedUntil = attempt.lockedUntil ? new Date(attempt.lockedUntil).getTime() : null;
      const locked = lockedUntil !== null && lockedUntil > now;
      return {
        ...attempt,
        locked: locked,
        remainingLockText: locked ? this.formatRemaining(lockedUntil! - now) : null,
        lockedUntilFormat: this.isSameDay(lockedUntil, now) ? 'HH:mm' : 'dd.MM.yyyy HH:mm'
      };
    });
  });

  /** The lockout rule in words, e.g. "Sperre nach 5 Fehlversuchen für 15 Minuten." */
  protected readonly lockoutRuleText = computed(() => {
    const settings = this.settings();
    if (!settings) {
      return null;
    }
    return `Sperre nach ${settings.maxFailures} Fehlversuchen für ${this.formatDuration(settings.lockoutDurationInSeconds)}.`;
  });

  /**
   * What the role="status" region in the template says. With no "Suchen" button to press, this is
   * the only thing that reports the outcome of a filter change to a screen reader - the list below
   * it being replaced is not a change it notices on its own.
   */
  protected readonly resultAnnouncement = signal('');

  constructor() {
    this.loadSettings();
    this.loadLoginAttempts();

    this.searchControl.valueChanges
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), map(value => value.trim()), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.loadLoginAttempts(1, this.loginAttempts()?.pageSize));

    const ticker = setInterval(() => this.now.set(Date.now()), LOCK_TICK_MS);
    this.destroyRef.onDestroy(() => clearInterval(ticker));
  }

  private loadSettings() {
    // Only the sentence stating the rule depends on it, so a failure here stays quiet rather than
    // adding a second error toast next to the one the list itself would already have shown.
    this.userApiService.getLoginAttemptSettings().subscribe({
      next: settings => this.settings.set(settings),
      error: () => this.settings.set(null)
    });
  }

  protected loadLoginAttempts(page?: number, pageSize?: number) {
    this.userApiService.getLoginAttempts(page, pageSize, this.searchControl.value.trim(), this.statusFilter() === 'LOCKED')
      .subscribe({
        next: data => {
          this._loginAttempts.set(data);
          this.now.set(Date.now());
          this.lastUpdatedAt.set(new Date());
          this.resultAnnouncement.set(`${data.totalCount} Anmelde-Versuche gefunden`);
        },
        error: () => this.toastr.error('Fehler beim Laden der Anmelde-Versuche', 'Fehler')
      });
  }

  protected onStatusFilterChanged(event: MatButtonToggleChange) {
    this.statusFilter.set(event.value as LoginAttemptFilter);
    this.loadLoginAttempts(1, this.loginAttempts()?.pageSize);
  }

  protected refresh() {
    this.loadLoginAttempts(this.loginAttempts()?.currentPage, this.loginAttempts()?.pageSize);
  }

  /**
   * Lifts the lock without asking: someone is standing at a locked screen, and the entry the lock
   * lives in is a failure counter, not a record worth keeping.
   */
  protected unlock(loginAttempt: LoginAttemptRow) {
    this.removeLoginAttempt(loginAttempt, `Sperre für ${loginAttempt.username} aufgehoben`);
  }

  /** The same deletion for an entry nobody is locked out by - which is why this one asks first. */
  protected resetLoginAttempt(loginAttempt: LoginAttemptRow) {
    this.dialog.open(ResetLoginAttemptDialogComponent, {data: {username: loginAttempt.username}})
      .afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.removeLoginAttempt(loginAttempt, `Fehlversuche für ${loginAttempt.username} zurückgesetzt`);
      }
    });
  }

  private removeLoginAttempt(loginAttempt: LoginAttemptRow, successMessage: string) {
    this.userApiService.deleteLoginAttempt(loginAttempt.id).subscribe({
      next: () => {
        this.toastr.success(successMessage, 'Erfolgreich');
        this.loadLoginAttempts(this.loginAttempts()?.currentPage, this.loginAttempts()?.pageSize);
      },
      error: () => this.toastr.error('Zurücksetzen fehlgeschlagen', 'Fehler')
    });
  }

  /**
   * The remaining lock time, rounded up to whole minutes: the decision it serves is "warten oder
   * entsperren?", which seconds don't change.
   */
  private formatRemaining(remainingMs: number): string {
    const minutes = Math.ceil(remainingMs / 60_000);
    if (minutes < 60) {
      return `noch ${minutes} Min.`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      const remainingMinutes = minutes % 60;
      return remainingMinutes === 0 ? `noch ${hours} Std.` : `noch ${hours} Std. ${remainingMinutes} Min.`;
    }

    const days = Math.floor(hours / 24);
    return days === 1 ? 'noch 1 Tag' : `noch ${days} Tage`;
  }

  /** The configured lockout duration in the unit it was configured in, e.g. "15 Minuten". */
  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return seconds === 1 ? '1 Sekunde' : `${seconds} Sekunden`;
    }

    const minutes = Math.round(seconds / 60);
    return minutes === 1 ? '1 Minute' : `${minutes} Minuten`;
  }

  private isSameDay(timestamp: number | null, now: number): boolean {
    if (timestamp === null) {
      return false;
    }
    return new Date(timestamp).toDateString() === new Date(now).toDateString();
  }

  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
}
