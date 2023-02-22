import {Component, ViewChild} from '@angular/core';
import {AuthenticationService} from '../../security/authentication.service';
import {ITafelNavData, navigationMenuItems} from '../../../modules/dashboard/navigation-menuItems';
import {PasswordChangeModalComponent} from '../passwordchange-modal/passwordchange-modal.component';
import {DistributionApiService} from '../../../api/distribution-api.service';

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
    private auth: AuthenticationService,
    private distributionApiService: DistributionApiService
  ) {
    if (this.auth.hasAnyPermission()) {
      let modifiedNavItems = this.filterNavItemsByPermissions(navigationMenuItems);
      modifiedNavItems = this.editNavItemsForDistributionState(modifiedNavItems);
      modifiedNavItems = this.filterEmptyTitleItems(modifiedNavItems);
      this.navItems = modifiedNavItems;
    }
  }

  toggleMinimize(e) {
    this.sidebarMinimized = e;
  }

  public onLogout() {
    this.auth.logout().subscribe(_ => {
      this.auth.redirectToLogin();
    });
  }

  public changePassword() {
    this.passwordChangeModalComponent.showDialog();
  }

  public filterNavItemsByPermissions(navItems: ITafelNavData[]): ITafelNavData[] {
    const resultNavItems: ITafelNavData[] = [];

    navItems?.forEach(navItem => {
      let missingPermission = false;

      navItem.permissions?.forEach(permission => {
        if (!this.auth.hasPermission(permission)) {
          missingPermission = true;
        }
      });

      if (navItem.title || !missingPermission) {
        resultNavItems.push(navItem);
      }
    });

    return resultNavItems;
  }

  private filterEmptyTitleItems(navItems: ITafelNavData[]): ITafelNavData[] {
    const resultNavItems: ITafelNavData[] = [];

    navItems.forEach((currentItem, index) => {
      const nextItem = (index + 1) < navItems.length ? navItems[index + 1] : undefined;

      if (currentItem.title && (!nextItem || nextItem.title)) {
        return;
      }

      resultNavItems.push(currentItem);
    });

    return resultNavItems;
  }

  public editNavItemsForDistributionState(navItems: ITafelNavData[]): ITafelNavData[] {
    /*
    const distributionActive = await this.distributionApiService.getCurrentDistribution() === undefined;
    console.log("DIS", await this.distributionApiService.getCurrentDistribution())
    console.log("ACTIVE", distributionActive)
     */
    const distributionActive = false;

    const resultNavItems: ITafelNavData[] = [];

    navItems?.forEach(navItem => {
      if (navItem.activeDistributionRequired && !distributionActive) {
        const modifiedNavItem = {
          ...navItem,
          badge: {
            variant: 'danger',
            text: 'INAKTIV'
          },
          attributes: {disabled: true}
        };
        resultNavItems.push(modifiedNavItem);
      } else {
        resultNavItems.push(navItem);
      }
    });

    return resultNavItems;
  }

}
