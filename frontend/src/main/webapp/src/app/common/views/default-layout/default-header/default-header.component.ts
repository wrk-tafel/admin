import {Component, computed, inject, output} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';
import {MatMenuModule} from '@angular/material/menu';
import {MatDividerModule} from '@angular/material/divider';
import {MatDialog} from '@angular/material/dialog';
import {DatePipe, NgClass, NgOptimizedImage} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faBars, faBell, faCircleQuestion, faKey, faLink, faLinkSlash, faLock} from '@fortawesome/free-solid-svg-icons';
import {AuthenticationService} from '../../../security/authentication.service';
import {GlobalStateService} from '../../../state/global-state.service';
import {SupportApiService} from '../../../../api/support-api.service';
import {SupportContextService} from '../../../support/support-context.service';
import {ScreenshotService} from '../../../support/screenshot.service';
import {TafelToastrService} from '../../../components/tafel-toastr/tafel-toastr.service';
import {SupportDialogComponent, SupportDialogResult} from './dialogs/support-dialog.component';
import {MatButton} from '@angular/material/button';
import {ConfigApiService} from '../../../../api/config-api.service';
import {TafelTitleStrategy} from '../../../util/tafel-title-strategy';

@Component({
  selector: 'tafel-default-header',
  templateUrl: 'default-header.component.html',
  imports: [
    RouterLink,
    MatMenuModule,
    MatDividerModule,
    NgClass,
    NgOptimizedImage,
    FaIconComponent,
    MatButton,
    DatePipe
  ]
})
export class DefaultHeaderComponent {
  readonly toggleSidebar = output<void>();

  private readonly authenticationService = inject(AuthenticationService);
  private readonly globalStateService = inject(GlobalStateService);
  private readonly supportApiService = inject(SupportApiService);
  private readonly supportContextService = inject(SupportContextService);
  private readonly screenshotService = inject(ScreenshotService);
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

  public logout() {
    this.authenticationService.logout().subscribe();
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

  protected readonly faBars = faBars;
  protected readonly faCircleQuestion = faCircleQuestion;
  protected readonly faBell = faBell;
  protected readonly faKey = faKey;
  protected readonly faLock = faLock;
  protected readonly faLink = faLink;
  protected readonly faLinkSlash = faLinkSlash;
}
