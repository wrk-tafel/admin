import {Component, computed, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {AuthenticationService} from '../../../../common/security/authentication.service';
import {ITafelNavData, navigationMenuItems} from '../../../../common/views/default-layout/navigation-menuItems';

interface SettingsGroup {
  title: string;
  entries: ITafelNavData[];
}

/**
 * Landing page of `/einstellungen`: every settings screen the user may open, as a card under its
 * topic. The sidebar carries only the one "Einstellungen" link; the entries and their grouping come
 * from that item's children in `navigation-menuItems.ts`, so this page and the quick-open palette
 * cannot disagree about which screens exist.
 */
@Component({
  selector: 'tafel-settings-overview',
  templateUrl: 'settings-overview.component.html',
  imports: [RouterLink]
})
export class SettingsOverviewComponent {
  private readonly authenticationService = inject(AuthenticationService);

  readonly groups = computed<SettingsGroup[]>(() => {
    const settings = navigationMenuItems.find(item => item.url === '/einstellungen');
    const groups: SettingsGroup[] = [];

    settings?.children?.forEach(child => {
      if (child.title) {
        groups.push({title: child.name, entries: []});
        return;
      }
      const permitted = (child.permissions ?? []).every(permission => this.authenticationService.hasPermission(permission));
      if (permitted && groups.length > 0) {
        groups[groups.length - 1].entries.push(child);
      }
    });

    return groups.filter(group => group.entries.length > 0);
  });
}
