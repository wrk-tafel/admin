import {Component, inject, output} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatMenuModule} from '@angular/material/menu';
import {MatDividerModule} from '@angular/material/divider';
import {MatDialog} from '@angular/material/dialog';
import {NgClass, NgOptimizedImage} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faBars, faBell, faKey, faLink, faLinkSlash, faLock} from '@fortawesome/free-solid-svg-icons';
import {AuthenticationService} from '../../../security/authentication.service';
import {GlobalStateService} from '../../../state/global-state.service';
import {SupportApiService} from '../../../../api/support-api.service';
import {SupportContextService} from '../../../support/support-context.service';
import {ScreenshotService} from '../../../support/screenshot.service';
import {TafelToastrService} from '../../../components/tafel-toastr/tafel-toastr.service';
import {SupportDialogComponent, SupportDialogResult} from './dialogs/support-dialog.component';
import {MatButton} from '@angular/material/button';

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
    MatButton
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

  readonly sseConnected = this.globalStateService.getConnectionState();

  public logout() {
    this.authenticationService.logout().subscribe();
  }

  /**
   * The screenshot is taken before the dialog opens - the reporter's screen is the page they are
   * describing, not the dialog they are describing it in.
   */
  public async openSupportDialog() {
    const screenshot = await this.screenshotService.capture();

    this.dialog.open(SupportDialogComponent, {data: {screenshot}}).afterClosed()
      .subscribe((result: SupportDialogResult) => {
        if (result) {
          const clientContext = this.supportContextService.collect(
            result.includeScreenshot ? screenshot : null
          );
          this.supportApiService.createSupportRequest(result.title, result.text, clientContext).subscribe(() => {
            this.toastr.success('Support-Anfrage wurde übermittelt!');
          });
        }
      });
  }

  protected readonly faBars = faBars;
  protected readonly faBell = faBell;
  protected readonly faKey = faKey;
  protected readonly faLock = faLock;
  protected readonly faLink = faLink;
  protected readonly faLinkSlash = faLinkSlash;
}
