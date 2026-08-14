import {Component, DestroyRef, inject, output} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatMenuModule} from '@angular/material/menu';
import {MatDividerModule} from '@angular/material/divider';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {MatTooltipModule} from '@angular/material/tooltip';
import {NgClass, NgOptimizedImage} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faBars, faBell, faKey, faLink, faLinkSlash, faLock, faMagnifyingGlass} from '@fortawesome/free-solid-svg-icons';
import {AuthenticationService} from '../../../security/authentication.service';
import {GlobalStateService} from '../../../state/global-state.service';
import {SupportApiService} from '../../../../api/support-api.service';
import {SupportContextService} from '../../../support/support-context.service';
import {ScreenshotService} from '../../../support/screenshot.service';
import {TafelToastrService} from '../../../components/tafel-toastr/tafel-toastr.service';
import {SupportDialogComponent, SupportDialogResult} from './dialogs/support-dialog.component';
import {QuickOpenDialogComponent} from './dialogs/quick-open-dialog.component';
import {MatButton} from '@angular/material/button';

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
  protected readonly faMagnifyingGlass = faMagnifyingGlass;
  protected readonly faBell = faBell;
  protected readonly faKey = faKey;
  protected readonly faLock = faLock;
  protected readonly faLink = faLink;
  protected readonly faLinkSlash = faLinkSlash;
}
