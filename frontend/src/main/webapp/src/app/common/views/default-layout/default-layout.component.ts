import {Component, computed, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {MatSidenavContainer, MatSidenavModule} from '@angular/material/sidenav';
import {MatTooltipModule} from '@angular/material/tooltip';
import {BreakpointObserver} from '@angular/cdk/layout';
import {map} from 'rxjs';
import {MatIcon} from '@angular/material/icon';
import {DatePipe, NgClass, NgOptimizedImage} from '@angular/common';
import {DefaultHeaderComponent} from './default-header/default-header.component';
import {ITafelNavData, navigationMenuItems, registerNavigationIcons} from './navigation-menuItems';
import {AuthenticationService} from '../../security/authentication.service';
import {GlobalStateService} from '../../state/global-state.service';
import {DistributionItem} from '../../../api/distribution-api.service';
import {ConfigApiService} from '../../../api/config-api.service';
import {TafelTitleStrategy} from '../../util/tafel-title-strategy';
import {registerSvgIcons} from '../../util/svg-icon.util';
import keyboardArrowDownIcon from '@material-symbols/svg-400/outlined/keyboard_arrow_down-fill.svg';
import keyboardArrowRightIcon from '@material-symbols/svg-400/outlined/keyboard_arrow_right-fill.svg';
import keyboardDoubleArrowLeftIcon from '@material-symbols/svg-400/outlined/keyboard_double_arrow_left-fill.svg';
import keyboardDoubleArrowRightIcon from '@material-symbols/svg-400/outlined/keyboard_double_arrow_right-fill.svg';

// Matches the app's established Tailwind `lg` breakpoint, used elsewhere for the same
// desktop/mobile distinction (e.g. the sidebar collapse-toggle footer's `hidden lg:flex`).
const MOBILE_BREAKPOINT = '(max-width: 1023.98px)';

// Sidebar state a returning user expects to still find the way they left it - without this every
// full reload (not just an in-app navigation) reset both back to their defaults.
const COLLAPSED_STORAGE_KEY = 'tafel.sidenav.collapsed';
const EXPANDED_GROUPS_STORAGE_KEY = 'tafel.sidenav.expandedGroups';

@Component({
  selector: 'tafel-default-layout',
  templateUrl: 'default-layout.component.html',
  styleUrls: ['default-layout.component.scss'],
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatSidenavModule,
    MatIcon,
    NgClass,
    DatePipe,
    NgOptimizedImage,
    DefaultHeaderComponent,
    MatTooltipModule
  ]
})
export class DefaultLayoutComponent {
  private readonly authenticationService = inject(AuthenticationService);
  private readonly globalStateService = inject(GlobalStateService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly configApiService = inject(ConfigApiService);
  private readonly window = inject(Window);

  readonly distribution = this.globalStateService.getCurrentDistribution();
  readonly appConfig = toSignal(this.configApiService.observeConfig(), {initialValue: null});

  readonly collapsed = signal(this.loadCollapsedFromStorage());
  readonly expandedItems = signal<Set<string>>(this.loadExpandedGroupsFromStorage());

  constructor() {
    // Persisting from an effect (rather than inside toggleCollapsed/toggleExpanded) covers every
    // way the signals can change, not just the two toggle methods.
    effect(() => this.persistToStorage(COLLAPSED_STORAGE_KEY, String(this.collapsed())));
    effect(() => this.persistToStorage(EXPANDED_GROUPS_STORAGE_KEY, JSON.stringify([...this.expandedItems()])));

    registerSvgIcons({
      keyboard_arrow_down: keyboardArrowDownIcon,
      keyboard_arrow_right: keyboardArrowRightIcon,
      keyboard_double_arrow_left: keyboardDoubleArrowLeftIcon,
      keyboard_double_arrow_right: keyboardDoubleArrowRightIcon
    });
    registerNavigationIcons();
  }

  // The sidenav is always "opened" in `side` mode - collapsing only shrinks its width via a CSS class,
  // it's never closed/reopened. Material's content-margin recalculation only runs on open/close toggles,
  // mode changes and window resizes, so it never notices this width change on its own, leaving the content
  // area reserving space for the pre-collapse width (a blank gap) instead of expanding into it. Recompute
  // it manually once Angular has applied the new width class to the DOM.
  readonly sidenavContainer = viewChild.required(MatSidenavContainer);

  readonly mainContent = viewChild.required<ElementRef<HTMLElement>>('mainContent');

  /** The page's `h1`; see `TafelTitleStrategy.routeTitle`. */
  readonly pageTitle = inject(TafelTitleStrategy).routeTitle;

  toggleCollapsed() {
    this.collapsed.update(value => !value);
    setTimeout(() => this.sidenavContainer().updateContentMargins());
  }

  skipToContent(event: Event) {
    event.preventDefault();
    this.mainContent().nativeElement.focus();
  }

  // Compute the initial value synchronously (rather than defaulting to "desktop" for one render
  // cycle) so the layout doesn't visibly flip mode/width immediately after bootstrap.
  readonly isMobile = toSignal(
    this.breakpointObserver.observe(MOBILE_BREAKPOINT).pipe(map(result => result.matches)),
    {initialValue: this.breakpointObserver.isMatched(MOBILE_BREAKPOINT)}
  );
  readonly sidenavMode = computed<'over' | 'side'>(() => this.isMobile() ? 'over' : 'side');

  // `collapsed` is the persisted preference and stays true even while `isMobile()` is - the
  // collapse-to-icons toggle is `hidden lg:flex`, so a mobile user has no way to clear it. Without
  // this, a sidebar collapsed on a wide window renders as the same narrow icon rail once the
  // overlay opens below the breakpoint, instead of the full-width labelled overlay the user guide
  // describes - the template reads this, not `collapsed()` directly, everywhere collapse affects
  // what's rendered.
  readonly effectiveCollapsed = computed(() => this.collapsed() && !this.isMobile());

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

  toggleExpanded(name: string, event?: Event) {
    const expanding = !this.expandedItems().has(name);
    this.expandedItems.update(current => {
      const updated = new Set(current);
      if (updated.has(name)) {
        updated.delete(name);
      } else {
        updated.add(name);
      }
      return updated;
    });

    // Expanding a group sitting at the bottom of the nav scrollport would otherwise change nothing
    // visible - the submenu renders entirely below the fold. Scroll the group (button + submenu,
    // their common parent div) into view once the submenu exists in the DOM.
    if (expanding && event?.currentTarget) {
      const group = (event.currentTarget as HTMLElement).parentElement;
      setTimeout(() => group?.scrollIntoView({block: 'nearest'}));
    }
  }

  private loadCollapsedFromStorage(): boolean {
    try {
      return this.window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private loadExpandedGroupsFromStorage(): Set<string> {
    try {
      const raw = this.window.localStorage.getItem(EXPANDED_GROUPS_STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  // localStorage can throw (quota, private browsing) - the sidebar still works for this session,
  // the state just won't survive a reload.
  private persistToStorage(key: string, value: string) {
    try {
      this.window.localStorage.setItem(key, value);
    } catch {
      // see above
    }
  }

}
