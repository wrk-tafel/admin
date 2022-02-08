import { Component } from '@angular/core';
import { AuthenticationService } from '../../common/security/authentication.service';
import { navItems } from '../../_nav';

@Component({
  selector: 'app-dashboard',
  templateUrl: './default-layout.component.html'
})
export class DefaultLayoutComponent {
  public sidebarMinimized = false;
  public navItems = navItems;

  constructor(
    private auth: AuthenticationService
  ) { }

  toggleMinimize(e) {
    this.sidebarMinimized = e;
  }

  public onLogout() {
    this.auth.logoutAndRedirect();
  }

}
