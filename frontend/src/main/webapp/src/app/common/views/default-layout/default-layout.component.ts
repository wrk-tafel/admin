import {Component, computed, inject, signal} from '@angular/core';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {MatSidenavModule} from '@angular/material/sidenav';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faAngleLeft, faAngleRight} from '@fortawesome/free-solid-svg-icons';
import {NgClass} from '@angular/common';
import {DefaultHeaderComponent} from './default-header/default-header.component';
import {ITafelNavData, navigationMenuItems} from './navigation-menuItems';
import {AuthenticationService} from '../../security/authentication.service';
import {GlobalStateService} from '../../state/global-state.service';
import {DistributionItem} from '../../../api/distribution-api.service';

@Component({
  selector: 'tafel-default-layout',
  templateUrl: 'default-layout.component.html',
  styleUrls: ['default-layout.component.scss'],
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatSidenavModule,
    FaIconComponent,
    NgClass,
    DefaultHeaderComponent
  ]
})
export class DefaultLayoutComponent {
  private readonly authenticationService = inject(AuthenticationService);
  private readonly globalStateService = inject(GlobalStateService);

  readonly distribution = this.globalStateService.getCurrentDistribution();

  readonly collapsed = signal(false);
  readonly expandedItems = signal<Set<string>>(new Set());

  readonly navItems = computed(() => {
    const distribution = this.distribution();
    let items = this.filterNavItemsByPermissions(navigationMenuItems);
    items = this.filterEmptyTitleItems(items);
    items = this.editNavItemsForDistributionState(items, distribution);
    return items;
  });

  public filterNavItemsByPermissions(navItems: ITafelNavData[] | null): ITafelNavData[] {
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

  public editNavItemsForDistributionState(navItems: ITafelNavData[], distribution: DistributionItem | null): ITafelNavData[] {
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

  toggleExpanded(name: string) {
    this.expandedItems.update(current => {
      const updated = new Set(current);
      if (updated.has(name)) {
        updated.delete(name);
      } else {
        updated.add(name);
      }
      return updated;
    });
  }

  protected readonly faAngleLeft = faAngleLeft;
  protected readonly faAngleRight = faAngleRight;
}
