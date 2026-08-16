import {Component, input} from '@angular/core';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatIcon} from '@angular/material/icon';
import {registerSvgIcons} from '../../util/svg-icon.util';
import infoIcon from '@material-symbols/svg-400/outlined/info.svg';

/**
 * Small info icon next to a label whose meaning isn't obvious from the label alone. The
 * explanation is shown as a tooltip on hover, on keyboard focus and on long-press (touch).
 *
 * The host is a real <button> so the explanation is reachable without a pointer - a plain <span>
 * would only ever show it on hover and stay invisible to keyboard and screen reader users.
 */
@Component({
  selector: 'tafel-info-tooltip',
  templateUrl: 'tafel-info-tooltip.component.html',
  imports: [
    MatTooltipModule,
    MatIcon
  ]
})
export class TafelInfoTooltipComponent {
  private readonly registerIcons = registerSvgIcons({info: infoIcon});

  text = input.required<string>();
  testId = input<string>('info-tooltip');
}
