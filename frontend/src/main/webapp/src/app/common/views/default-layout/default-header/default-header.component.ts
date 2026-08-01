import {Component, inject, output} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatMenuModule} from '@angular/material/menu';
import {MatDividerModule} from '@angular/material/divider';
import {MatDialog} from '@angular/material/dialog';
import {NgClass, NgOptimizedImage} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faBars, faCircleQuestion, faKey, faLock} from '@fortawesome/free-solid-svg-icons';
import {AuthenticationService} from '../../../security/authentication.service';
import {GlobalStateService} from '../../../state/global-state.service';
import {SupportApiService} from '../../../../api/support-api.service';
import {TafelToastrService} from '../../../components/tafel-toastr/tafel-toastr.service';
import {SupportDialogComponent} from './dialogs/support-dialog.component';

@Component({
  selector: 'tafel-default-header',
  templateUrl: 'default-header.component.html',
  imports: [
    RouterLink,
    MatMenuModule,
    MatDividerModule,
    NgClass,
    NgOptimizedImage,
    FaIconComponent
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
    this.dialog.open(SupportDialogComponent).afterClosed().subscribe(supportText => {
      if (supportText) {
        this.supportApiService.createSupportRequest(supportText).subscribe(() => {
          this.toastr.success('Support-Anfrage wurde übermittelt!');
        });
      }
    });
  }

  protected readonly faBars = faBars;
  protected readonly faCircleQuestion = faCircleQuestion;
  protected readonly faKey = faKey;
  protected readonly faLock = faLock;
}
