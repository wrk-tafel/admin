import {Component, inject, input, Signal} from '@angular/core';
import {
  AvatarComponent,
  BadgeComponent,
  ButtonDirective,
  ContainerComponent,
  DropdownComponent,
  DropdownDividerDirective,
  DropdownHeaderDirective,
  DropdownItemDirective,
  DropdownMenuDirective,
  DropdownToggleDirective,
  HeaderComponent,
  HeaderNavComponent,
  HeaderTogglerDirective,
  SidebarToggleDirective,
  TextColorDirective
} from '@coreui/angular';
import {AuthenticationService} from '../../../security/authentication.service';
import {RouterLink} from '@angular/router';
import {IconDirective} from '@coreui/icons-angular';
import {NgTemplateOutlet} from '@angular/common';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faKey, faLock} from '@fortawesome/free-solid-svg-icons';
import {GlobalStateService} from '../../../state/global-state.service';

@Component({
    selector: 'app-default-header',
    templateUrl: './default-header.component.html',
    imports: [
        ContainerComponent,
        SidebarToggleDirective,
        HeaderNavComponent,
        DropdownComponent,
        DropdownToggleDirective,
        AvatarComponent,
        RouterLink,
        HeaderTogglerDirective,
        IconDirective,
        ButtonDirective,
        TextColorDirective,
        NgTemplateOutlet,
        DropdownMenuDirective,
        DropdownHeaderDirective,
        DropdownItemDirective,
        DropdownDividerDirective,
        BadgeComponent,
        FontAwesomeModule
    ]
})
export class DefaultHeaderComponent extends HeaderComponent {
  sidebarId = input('sidebar');

  private readonly authenticationService = inject(AuthenticationService);
  private readonly globalStateService = inject(GlobalStateService);

  readonly sseConnected: Signal<boolean> = this.globalStateService.getConnectionState();

  public logout() {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    this.authenticationService.logout().subscribe(_ => {
      this.authenticationService.redirectToLogin();
    });
  }

  protected readonly faKey = faKey;
  protected readonly faLock = faLock;
}
