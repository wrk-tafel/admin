import {Component, inject, Input} from '@angular/core';
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
  NavItemComponent,
  NavLinkDirective,
  SidebarToggleDirective,
  TextColorDirective
} from '@coreui/angular';
import {AuthenticationService} from '../../../security/authentication.service';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {IconDirective} from '@coreui/icons-angular';
import {NgTemplateOutlet} from '@angular/common';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faKey, faLock} from '@fortawesome/free-solid-svg-icons';

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
    NavItemComponent,
    BadgeComponent,
    NavLinkDirective,
    RouterLinkActive,
    FontAwesomeModule
  ],
  standalone: true
})
export class DefaultHeaderComponent extends HeaderComponent {
  @Input() sidebarId = 'sidebar';
  private readonly authenticationService = inject(AuthenticationService);

  public logout() {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    this.authenticationService.logout().subscribe(_ => {
      this.authenticationService.redirectToLogin();
    });
  }

  protected readonly faKey = faKey;
  protected readonly faLock = faLock;
}
