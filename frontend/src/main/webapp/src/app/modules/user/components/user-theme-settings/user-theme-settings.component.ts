import {Component, inject} from '@angular/core';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatRadioButton, MatRadioChange, MatRadioGroup} from '@angular/material/radio';
import {MatIcon} from '@angular/material/icon';
import {ThemeService} from '../../../../common/theme/theme.service';
import {ThemePreference} from '../../../../api/user-api.service';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import lightModeIcon from '@material-symbols/svg-400/outlined/light_mode-fill.svg';
import darkModeIcon from '@material-symbols/svg-400/outlined/dark_mode-fill.svg';
import brightnessAutoIcon from '@material-symbols/svg-400/outlined/brightness_auto-fill.svg';

/**
 * The "Design" tab of "Mein Konto": light, dark, or follow the device. The choice is saved on the account, so it
 * follows the user to every device (see `ThemeService`); it applies at once, not on a save button.
 */
@Component({
  selector: 'tafel-user-theme-settings',
  templateUrl: 'user-theme-settings.component.html',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatRadioGroup,
    MatRadioButton,
    MatIcon
  ]
})
export class UserThemeSettingsComponent {
  private readonly registerIcons = registerSvgIcons({
    light_mode: lightModeIcon,
    dark_mode: darkModeIcon,
    brightness_auto: brightnessAutoIcon
  });

  private readonly themeService = inject(ThemeService);

  readonly themeOptions: readonly { value: ThemePreference; label: string; description: string; icon: string }[] = [
    {value: 'LIGHT', label: 'Hell', description: 'Helle Oberflächen, immer.', icon: 'light_mode'},
    {value: 'DARK', label: 'Dunkel', description: 'Dunkle Oberflächen, immer.', icon: 'dark_mode'},
    {value: 'SYSTEM', label: 'System', description: 'Folgt der Einstellung des Geräts.', icon: 'brightness_auto'}
  ];
  readonly themePreference = this.themeService.preference;

  setTheme(event: MatRadioChange) {
    return this.themeService.setPreference(event.value as ThemePreference);
  }
}
