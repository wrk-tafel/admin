import {Component, computed, inject, signal, viewChild} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {MatSidenavContainer, MatSidenavModule} from '@angular/material/sidenav';
import {BreakpointObserver} from '@angular/cdk/layout';
import {map} from 'rxjs';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faAngleDown, faAngleRight, faAnglesLeft, faAnglesRight} from '@fortawesome/free-solid-svg-icons';
import {DatePipe, NgClass, NgOptimizedImage} from '@angular/common';
import {DefaultHeaderComponent} from './default-header/default-header.component';
import {ITafelNavData, navigationMenuItems} from './navigation-menuItems';
import {AuthenticationService} from '../../security/authentication.service';
import {GlobalStateService} from '../../state/global-state.service';
import {DistributionItem} from '../../../api/distribution-api.service';
import {VersionApiService} from '../../../api/version-api.service';

// Matches the app's established Tailwind `lg` breakpoint, used elsewhere for the same
// desktop/mobile distinction (e.g. the sidebar collapse-toggle footer's `hidden lg:flex`).
const MOBILE_BREAKPOINT = '(max-width: 1023.98px)';

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
    DatePipe,
    NgOptimizedImage,
    DefaultHeaderComponent
  ]
})
export class DefaultLayoutComponent {
  private readonly authenticationService = inject(AuthenticationService);
  private readonly globalStateService = inject(GlobalStateService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly versionApiService = inject(VersionApiService);

  readonly distribution = this.globalStateService.getCurrentDistribution();
  readonly versionInfo = toSignal(this.versionApiService.getVersion(), {initialValue: null});

  readonly collapsed = signal(false);
  readonly expandedItems = signal<Set<string>>(new Set());

  // The sidenav is always "opened" in `side` mode - collapsing only shrinks its width via a CSS class,
  // it's never closed/reopened. Material's content-margin recalculation only runs on open/close toggles,
  // mode changes and window resizes, so it never notices this width change on its own, leaving the content
  // area reserving space for the pre-collapse width (a blank gap) instead of expanding into it. Recompute
  // it manually once Angular has applied the new width class to the DOM.
  readonly sidenavContainer = viewChild.required(MatSidenavContainer);

  toggleCollapsed() {
    this.collapsed.update(value => !value);
    setTimeout(() => this.sidenavContainer().updateContentMargins());
  }

  // Compute the initial value synchronously (rather than defaulting to "desktop" for one render
  // cycle) so the layout doesn't visibly flip mode/width immediately after bootstrap.
  readonly isMobile = toSignal(
    this.breakpointObserver.observe(MOBILE_BREAKPOINT).pipe(map(result => result.matches)),
    {initialValue: this.breakpointObserver.isMatched(MOBILE_BREAKPOINT)}
  );
  readonly sidenavMode = computed<'over' | 'side'>(() => this.isMobile() ? 'over' : 'side');

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

      if (navItem.title) {
        resultNavItems.push(navItem);
        return;
      }

      if (missingPermission) {
        return;
      }

      if (navItem.children) {
        // children may carry their own (narrower) permissions, e.g. a collapsible group bundling
        // pages that each require a different permission - only the ones the user actually has
        // access to should render, and the group itself only if at least one of them survives
        const visibleChildren = this.filterNavItemsByPermissions(navItem.children);
        if (visibleChildren.length > 0) {
          resultNavItems.push({...navItem, children: visibleChildren});
        }
        return;
      }

      resultNavItems.push(navItem);
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

  protected readonly faAngleRight = faAngleRight;
  protected readonly faAngleDown = faAngleDown;
  protected readonly faAnglesRight = faAnglesRight;
  protected readonly faAnglesLeft = faAnglesLeft;
}
