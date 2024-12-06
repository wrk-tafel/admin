import {Component, inject, Input} from '@angular/core';
import {
  AvatarComponent,
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

@Component({
  selector: 'app-default-header',
  templateUrl: './default-header.component.html',
  standalone: true,
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
    FontAwesomeModule
  ]
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
