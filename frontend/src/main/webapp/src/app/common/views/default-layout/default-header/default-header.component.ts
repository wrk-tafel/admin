import {Component, inject, output} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatMenuModule} from '@angular/material/menu';
import {MatDividerModule} from '@angular/material/divider';
import {NgClass, NgOptimizedImage} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faBars, faKey, faLock} from '@fortawesome/free-solid-svg-icons';
import {AuthenticationService} from '../../../security/authentication.service';
import {GlobalStateService} from '../../../state/global-state.service';

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

  readonly sseConnected = this.globalStateService.getConnectionState();

  public logout() {
    this.authenticationService.logout().subscribe(_ => {
      this.authenticationService.redirectToLogin();
    });
  }

  protected readonly faBars = faBars;
  protected readonly faKey = faKey;
  protected readonly faLock = faLock;
}
