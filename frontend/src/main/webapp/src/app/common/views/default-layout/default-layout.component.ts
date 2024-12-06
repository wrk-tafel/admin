import {Component, inject, OnInit} from '@angular/core';
import {RouterLink, RouterOutlet} from '@angular/router';
import {NgScrollbar} from 'ngx-scrollbar';
import {
  ContainerComponent,
  ShadowOnScrollDirective,
  SidebarBrandComponent,
  SidebarComponent,
  SidebarFooterComponent,
  SidebarHeaderComponent,
  SidebarNavComponent,
  SidebarToggleDirective,
  SidebarTogglerDirective
} from '@coreui/angular';
import {DefaultHeaderComponent} from './default-header/default-header.component';
import {ITafelNavData, navigationMenuItems} from './navigation-menuItems';
import {AuthenticationService} from '../../security/authentication.service';
import {GlobalStateService} from '../../state/global-state.service';
import {DistributionItem} from '../../../api/distribution-api.service';

@Component({
  selector: 'tafel-default-layout',
  templateUrl: 'default-layout.component.html',
  styleUrls: ['default-layout.component.scss'],
  standalone: true,
  imports: [
    SidebarComponent,
    SidebarHeaderComponent,
    SidebarBrandComponent,
    RouterLink,
    NgScrollbar,
    SidebarNavComponent,
    SidebarFooterComponent,
    SidebarToggleDirective,
    SidebarTogglerDirective,
    DefaultHeaderComponent,
    ShadowOnScrollDirective,
    ContainerComponent,
    RouterOutlet
  ]
})
export class DefaultLayoutComponent implements OnInit {
  public navItems: ITafelNavData[] = navigationMenuItems;
  private readonly authenticationService = inject(AuthenticationService);
  private readonly globalStateService = inject(GlobalStateService);

  ngOnInit() {
    this.globalStateService.getCurrentDistribution().subscribe((distribution: DistributionItem) => {
      this.navItems = this.filterNavItemsByPermissions(this.navItems);
      this.navItems = this.filterEmptyTitleItems(this.navItems);
      this.navItems = this.editNavItemsForDistributionState(this.navItems, distribution);
    });
  }

  public filterNavItemsByPermissions(navItems: ITafelNavData[]): ITafelNavData[] {
    const resultNavItems: ITafelNavData[] = [];

    navItems?.forEach(navItem => {
      let missingPermission = false;

      navItem.permissions?.forEach(permission => {
        if (!this.authenticationService.hasPermission(permission)) {
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
            text: 'INAKTIV',
            color: 'danger'
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
