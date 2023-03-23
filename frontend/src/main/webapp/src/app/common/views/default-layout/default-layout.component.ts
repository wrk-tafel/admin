import {Component, OnInit, ViewChild} from '@angular/core';
import {AuthenticationService} from '../../security/authentication.service';
import {ITafelNavData, navigationMenuItems} from '../../../modules/dashboard/navigation-menuItems';
import {PasswordChangeModalComponent} from '../passwordchange-modal/passwordchange-modal.component';
import {DistributionItem} from '../../../api/distribution-api.service';
import {GlobalStateService} from '../../state/global-state.service';

@Component({
  selector: 'tafel-default-layout',
  templateUrl: './default-layout.component.html'
})
export class DefaultLayoutComponent implements OnInit {
  public sidebarMinimized = false;
  public navItems: ITafelNavData[] = navigationMenuItems;

  @ViewChild(PasswordChangeModalComponent)
  private passwordChangeModalComponent: PasswordChangeModalComponent;

  constructor(
    private auth: AuthenticationService,
    private globalStateService: GlobalStateService
  ) {
  }

  ngOnInit() {
    this.globalStateService.getCurrentDistribution().subscribe((distribution: DistributionItem) => {
      if (this.auth.hasAnyPermission()) {
        this.navItems = this.filterNavItemsByPermissions(this.navItems);
        this.navItems = this.filterEmptyTitleItems(this.navItems);
      }
      this.navItems = this.editNavItemsForDistributionState(this.navItems, distribution);
    });
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

  public filterEmptyTitleItems(navItems: ITafelNavData[]): ITafelNavData[] {
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

  public editNavItemsForDistributionState(navItems: ITafelNavData[], distribution: DistributionItem): ITafelNavData[] {
    const resultNavItems: ITafelNavData[] = [];

    navItems?.forEach(navItem => {
      if (navItem.activeDistributionRequired && !distribution) {
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
        const modifiedNavItem = {
          ...navItem
        };
        delete modifiedNavItem['badge'];
        delete modifiedNavItem['attributes'];
        resultNavItems.push(modifiedNavItem);
      }
    });

    return resultNavItems;
  }

}
