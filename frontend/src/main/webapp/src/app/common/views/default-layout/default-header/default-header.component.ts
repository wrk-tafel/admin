import {Component, inject, Input} from '@angular/core';
import {
  AvatarComponent,
  ContainerComponent,
  DropdownComponent, DropdownToggleDirective,
  HeaderComponent,
  HeaderNavComponent,
  SidebarToggleDirective
} from '@coreui/angular';
import {AuthenticationService} from '../../../security/authentication.service';
import {RouterLink} from '@angular/router';

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
    RouterLink
  ],
  standalone: true
})
export class DefaultHeaderComponent extends HeaderComponent {
  @Input() sidebarId = 'sidebar';
  private authenticationService = inject(AuthenticationService);

  public logout() {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    this.authenticationService.logout().subscribe(_ => {
      this.authenticationService.redirectToLogin();
    });
  }

}
