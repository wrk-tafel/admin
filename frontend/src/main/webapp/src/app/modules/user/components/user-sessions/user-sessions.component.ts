import {Component, computed, effect, inject, signal} from '@angular/core';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {DatePipe} from '@angular/common';
import {UserApiService, UserSessionItem} from '../../../../api/user-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {userAgentDeviceType, userAgentLabel} from '../../../../common/util/user-agent-label.util';
import {relativeTimeLabel} from '../../../../common/util/relative-time.util';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import logoutIcon from '@material-symbols/svg-400/outlined/logout-fill.svg';
import mobile2Icon from '@material-symbols/svg-400/outlined/mobile_2-fill.svg';
import desktopWindowsIcon from '@material-symbols/svg-400/outlined/desktop_windows-fill.svg';
import questionMarkIcon from '@material-symbols/svg-400/outlined/question_mark-fill.svg';

/**
 * The "Sitzungen" topic of "Mein Konto": where the user is logged in, and a way to end a login they no longer
 * want - the one left open on the shared PC at the distribution, the phone that was lost. The session the page
 * itself runs on is marked and is ended by logging out, so the list never logs its own user out.
 */
@Component({
  selector: 'tafel-user-sessions',
  templateUrl: 'user-sessions.component.html',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatButton,
    MatIcon,
    MatTooltipModule,
    DatePipe
  ]
})
export class UserSessionsComponent {
  private readonly registerIcons = registerSvgIcons({
    logout: logoutIcon,
    mobile_2: mobile2Icon,
    desktop_windows: desktopWindowsIcon,
    question_mark: questionMarkIcon
  });

  private readonly userApiService = inject(UserApiService);
  private readonly toastr = inject(TafelToastrService);

  readonly sessions = signal<UserSessionItem[]>([]);
  readonly loading = signal(true);
  readonly otherSessions = computed(() => this.sessions().filter(session => !session.current));

  constructor() {
    effect(() => {
      this.loadSessions();
    });
  }

  loadSessions() {
    this.userApiService.getSessions().subscribe({
      next: response => {
        this.sessions.set(response.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastr.error('Sitzungen konnten nicht geladen werden.');
      }
    });
  }

  endSession(session: UserSessionItem) {
    this.userApiService.endSession(session.id).subscribe({
      next: () => {
        this.toastr.success('Sitzung wurde beendet.');
        this.loadSessions();
      },
      error: () => this.toastr.error('Sitzung konnte nicht beendet werden.')
    });
  }

  endOtherSessions() {
    this.userApiService.endOtherSessions().subscribe({
      next: () => {
        this.toastr.success('Alle anderen Sitzungen wurden beendet.');
        this.loadSessions();
      },
      error: () => this.toastr.error('Sitzungen konnten nicht beendet werden.')
    });
  }

  protected deviceLabel(session: UserSessionItem): string {
    return userAgentLabel(session.userAgent);
  }

  protected deviceIcon(session: UserSessionItem): string {
    switch (userAgentDeviceType(session.userAgent)) {
      case 'mobile':
        return 'mobile_2';
      case 'desktop':
        return 'desktop_windows';
      default:
        return 'question_mark';
    }
  }

  protected deviceTypeLabel(session: UserSessionItem): string {
    switch (userAgentDeviceType(session.userAgent)) {
      case 'mobile':
        return 'Mobiles Gerät';
      case 'desktop':
        return 'Computer';
      default:
        return 'Unbekannter Gerätetyp';
    }
  }

  protected lastUsedAgo(session: UserSessionItem): string | null {
    return relativeTimeLabel(session.lastUsedAt);
  }
}
