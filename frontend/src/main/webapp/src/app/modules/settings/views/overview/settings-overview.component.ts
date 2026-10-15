import {Component, computed, inject} from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {RouterLink} from '@angular/router';
import {AuthenticationService} from '../../../../common/security/authentication.service';
import {ITafelNavData, registerNavigationIcons, settingsMenuItems} from '../../../../common/views/default-layout/navigation-menuItems';

interface SettingsGroup {
  title: string;
  entries: ITafelNavData[];
}

/**
 * Landing page of `/einstellungen`: every settings screen the user may open, as a card under its
 * topic. The main menu carries only the one "Einstellungen" link, and the sidebar lists the screens
 * once a settings page is open; the entries and their grouping come from `settingsMenuItems` in
 * `navigation-menuItems.ts`, so this page, the sidebar and the quick-open palette cannot disagree
 * about which screens exist.
 */
@Component({
  selector: 'tafel-settings-overview',
  templateUrl: 'settings-overview.component.html',
  imports: [RouterLink, MatIcon]
})
export class SettingsOverviewComponent {
  private readonly authenticationService = inject(AuthenticationService);
  private readonly registerIcons = registerNavigationIcons();

  readonly groups = computed<SettingsGroup[]>(() => {
    const groups: SettingsGroup[] = [];

    settingsMenuItems.forEach(child => {
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
