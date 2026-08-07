import {Component, inject, output} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatMenuModule} from '@angular/material/menu';
import {MatDividerModule} from '@angular/material/divider';
import {MatDialog} from '@angular/material/dialog';
import {NgClass, NgOptimizedImage} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faBars, faBell, faKey, faLock} from '@fortawesome/free-solid-svg-icons';
import {AuthenticationService} from '../../../security/authentication.service';
import {GlobalStateService} from '../../../state/global-state.service';
import {SupportApiService} from '../../../../api/support-api.service';
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
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  readonly sseConnected = this.globalStateService.getConnectionState();

  public logout() {
    this.authenticationService.logout().subscribe(_ => {
      this.authenticationService.redirectToLogin();
    });
  }

  public openSupportDialog() {
    this.dialog.open(SupportDialogComponent).afterClosed().subscribe((result: SupportDialogResult) => {
      if (result) {
        this.supportApiService.createSupportRequest(result.title, result.text).subscribe(() => {
          this.toastr.success('Support-Anfrage wurde übermittelt!');
        });
      }
    });
  }

  protected readonly faBars = faBars;
  protected readonly faBell = faBell;
  protected readonly faKey = faKey;
  protected readonly faLock = faLock;
}
