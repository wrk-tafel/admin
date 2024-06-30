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
import {IconDirective} from "@coreui/icons-angular";
import {NgTemplateOutlet} from "@angular/common";

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
    DropdownDividerDirective
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
