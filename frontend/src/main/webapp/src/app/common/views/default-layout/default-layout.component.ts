import {Component, ViewChild} from '@angular/core';
import {INavData} from '@coreui/angular';
import {AuthenticationService} from '../../security/authentication.service';
import {IPermissionNavData, navigationMenuItems} from '../../../modules/dashboard/navigation-menuItems';
import {
  PasswordChangeModalComponent
} from '../../../modules/user/views/passwordchange-modal/passwordchange-modal.component';

@Component({
  selector: 'tafel-default-layout',
  templateUrl: './default-layout.component.html'
})
export class DefaultLayoutComponent {
  public sidebarMinimized = false;
  public navItems = [];

  @ViewChild(PasswordChangeModalComponent)
  private passwordChangeModalComponent: PasswordChangeModalComponent;

  constructor(
    private auth: AuthenticationService
  ) {
    if (this.auth.hasAnyPermission()) {
      this.navItems = this.getNavItemsFilteredByPermissions(navigationMenuItems);
    }
  }

  toggleMinimize(e) {
    this.sidebarMinimized = e;
  }

  public onLogout() {
    this.auth.logout().subscribe(response => {
      this.auth.redirectToLogin();
    });
  }

  public changePassword() {
    this.passwordChangeModalComponent.showDialog();
  }

  public getNavItemsFilteredByPermissions(navItems: IPermissionNavData[]) {
    const filteredNavItems: INavData[] = [];

    navItems?.forEach(navItem => {
      let missingPermission = false;

      navItem.permissions?.forEach(permission => {
        if (!this.auth.hasPermission(permission)) {
          missingPermission = true;
        }
      });

      if (navItem.title || !missingPermission) {
        filteredNavItems.push(navItem);
      }
    });

    return this.filterEmptyTitleItems(filteredNavItems);
  }

  private filterEmptyTitleItems(navItems: INavData[]) {
    const filteredNavItems: INavData[] = [];

    navItems.forEach((currentItem, index) => {
      const nextItem = (index + 1) < navItems.length ? navItems[index + 1] : undefined;

      if (currentItem.title && (!nextItem || nextItem.title)) {
        return;
      }

      filteredNavItems.push(currentItem);
    });

    return filteredNavItems;
  }

}
