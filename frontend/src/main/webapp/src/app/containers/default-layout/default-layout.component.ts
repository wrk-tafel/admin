import { Component } from '@angular/core';
import { INavData } from '@coreui/angular';
import { AuthenticationService } from '../../common/security/authentication.service';
import { IPermissionNavData, navigationMenuItems } from '../../views/dashboard/navigation-menuItems';

@Component({
  selector: 'app-dashboard',
  templateUrl: './default-layout.component.html'
})
export class DefaultLayoutComponent {
  public sidebarMinimized = false;
  public navItems = [];

  constructor(
    private auth: AuthenticationService
  ) {
    this.navItems = this.getNavItemsFilteredByPermissions(navigationMenuItems);
  }

  toggleMinimize(e) {
    this.sidebarMinimized = e;
  }

  public onLogout() {
    this.auth.logoutAndRedirect();
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

      if (!missingPermission) {
        filteredNavItems.push(navItem);
      }
    });

    return this.filterEmptyTitleItems(filteredNavItems);
  }

  private filterEmptyTitleItems(navItems: INavData[]) {
    if (navItems.length == 1) {
      if (navItems[0].title == true) {
        return [];
      }
      return navItems;
    }

    const filteredNavItems: INavData[] = [];

    for (let i = 0; i < navItems.length; i++) {
      const currentItem = navItems[i];

      if ((i + 2) > navItems.length) {
        filteredNavItems.push(currentItem);
        break;
      } else {
        const nextItem = navItems[i + 1];
        if (currentItem.title === true && nextItem.title === true) {
          continue;
        } else {
          filteredNavItems.push(currentItem);
        }
      }
    }

    return filteredNavItems;
  }

}
