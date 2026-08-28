import {Component, computed, DestroyRef, inject, output} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {HttpResponse} from '@angular/common/http';
import {RouterLink} from '@angular/router';
import {MatMenuModule} from '@angular/material/menu';
import {MatDividerModule} from '@angular/material/divider';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {MatTooltipModule} from '@angular/material/tooltip';
import {DatePipe, NgClass, NgOptimizedImage} from '@angular/common';
import {MatIcon} from '@angular/material/icon';
import {AuthenticationService} from '../../../security/authentication.service';
import {GlobalStateService} from '../../../state/global-state.service';
import {SupportApiService} from '../../../../api/support-api.service';
import {UserApiService} from '../../../../api/user-api.service';
import {SupportContextService} from '../../../support/support-context.service';
import {ScreenshotService} from '../../../support/screenshot.service';
import {FileHelperService} from '../../../util/file-helper.service';
import {parseContentDispositionFilename} from '../../../util/content-disposition.util';
import {TafelToastrService} from '../../../components/tafel-toastr/tafel-toastr.service';
import {SupportDialogComponent, SupportDialogResult} from './dialogs/support-dialog.component';
import {QuickOpenDialogComponent} from './dialogs/quick-open-dialog.component';
import {MatButton} from '@angular/material/button';
import {ConfigApiService} from '../../../../api/config-api.service';
import {TafelTitleStrategy} from '../../../util/tafel-title-strategy';
import {registerSvgIcons} from '../../../util/svg-icon.util';
import menuIcon from '@material-symbols/svg-400/outlined/menu-fill.svg';
import helpIcon from '@material-symbols/svg-400/outlined/help-fill.svg';
import searchIcon from '@material-symbols/svg-400/outlined/search-fill.svg';
import notificationsIcon from '@material-symbols/svg-400/outlined/notifications-fill.svg';
import bookIcon from '@material-symbols/svg-400/outlined/book-fill.svg';
import keyIcon from '@material-symbols/svg-400/outlined/key-fill.svg';
import downloadIcon from '@material-symbols/svg-400/outlined/download-fill.svg';
import lockIcon from '@material-symbols/svg-400/outlined/lock-fill.svg';
import linkIcon from '@material-symbols/svg-400/outlined/link-fill.svg';
import linkOffIcon from '@material-symbols/svg-400/outlined/link_off-fill.svg';

@Component({
  selector: 'tafel-default-header',
  templateUrl: 'default-header.component.html',
  imports: [
    RouterLink,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    NgClass,
    NgOptimizedImage,
    MatIcon,
    MatButton,
    DatePipe
  ]
})
export class DefaultHeaderComponent {
  readonly toggleSidebar = output<void>();

  private readonly authenticationService = inject(AuthenticationService);
  private readonly globalStateService = inject(GlobalStateService);
  private readonly supportApiService = inject(SupportApiService);
  private readonly userApiService = inject(UserApiService);
  private readonly supportContextService = inject(SupportContextService);
  private readonly screenshotService = inject(ScreenshotService);
  private readonly fileHelperService = inject(FileHelperService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);
  private readonly configApiService = inject(ConfigApiService);

  readonly sseConnected = this.globalStateService.getConnectionState();

  /**
   * So much of the app switches behavior on whether a distribution is active that the shell shows
   * it permanently, next to the Live-Verbindung badge, rather than only on the dashboard.
   */
  readonly distribution = this.globalStateService.getCurrentDistribution();
  readonly distributionActive = computed(() => {
    const distribution = this.distribution();
    return !!distribution && !distribution.endedAt;
  });

  /** The page's own title (`h1` on desktop, also shown visibly in the header on mobile). */
  readonly pageTitle = inject(TafelTitleStrategy).routeTitle;

  private readonly appConfig = toSignal(this.configApiService.observeConfig(), {initialValue: null});
  /**
   * Empty on production. Rendered as a banner so an already-logged-in session stays visibly
   * distinguishable from production too, not just the login page.
   */
  readonly environmentLabel = computed(() => this.appConfig()?.environmentLabel ?? '');

  private quickOpenDialogRef: MatDialogRef<QuickOpenDialogComponent> | null = null;

  /**
   * Ctrl+K / Cmd+K opens the quick-open palette from anywhere in the shell. `preventDefault`
   * claims the shortcut from the browser - Chrome and Firefox both put Ctrl+K into the address
   * bar's search otherwise, which would leave the page entirely.
   */
  constructor() {
    const quickOpenShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key?.toLowerCase() === 'k') {
        event.preventDefault();
        this.openQuickOpenDialog();
      }
    };
    document.addEventListener('keydown', quickOpenShortcut);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('keydown', quickOpenShortcut));

    registerSvgIcons({
      menu: menuIcon,
      help: helpIcon,
      search: searchIcon,
      notifications: notificationsIcon,
      book: bookIcon,
      key: keyIcon,
      download: downloadIcon,
      lock: lockIcon,
      link: linkIcon,
      link_off: linkOffIcon
    });
  }

  public openQuickOpenDialog() {
    if (this.quickOpenDialogRef) {
      return;
    }
    this.quickOpenDialogRef = this.dialog.open(QuickOpenDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      // anchored near the top instead of vertically centered, so the result list can grow
      // downwards without re-centering the dialog on every keystroke
      position: {top: '5rem'}
    });
    this.quickOpenDialogRef.afterClosed().subscribe(() => this.quickOpenDialogRef = null);
  }

  public logout() {
    this.authenticationService.logout().subscribe();
  }

  /** The GDPR Art. 15/20 data takeout for the caller's own account (issue #3363), as a downloadable PDF. */
  public exportUserData() {
    this.userApiService.exportUser().subscribe({
      next: (response) => this.processPdfResponse(response),
      error: () => this.toastr.error('Datenexport fehlgeschlagen!')
    });
  }

  /** The Art. 13 GDPR privacy notice for staff (issue #3429), as a downloadable PDF. */
  public downloadStaffPrivacyNotice() {
    this.userApiService.generatePrivacyNoticeTemplate().subscribe({
      next: (response) => this.processPdfResponse(response),
      error: () => this.toastr.error('Herunterladen fehlgeschlagen!')
    });
  }

  private processPdfResponse(response: HttpResponse<Blob>) {
    const filename = parseContentDispositionFilename(response.headers.get('content-disposition')!);
    this.fileHelperService.downloadFile(filename, response.body!);
  }

  /**
   * The screenshot is taken before the dialog opens - the reporter's screen is the page they are
   * describing, not the dialog they are describing it in.
   */
  public async openSupportDialog() {
    const screenshot = await this.screenshotService.capture();

    this.dialog.open(SupportDialogComponent).afterClosed()
      .subscribe((result: SupportDialogResult) => {
        if (result) {
          const clientContext = this.supportContextService.collect(screenshot);
          this.supportApiService.createSupportRequest(result.title, result.text, clientContext).subscribe(() => {
            this.toastr.success('Support-Anfrage wurde übermittelt!');
          });
        }
      });
  }
}
