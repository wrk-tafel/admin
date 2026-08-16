import {Component, computed, input} from '@angular/core';
import {MatCard, MatCardContent} from '@angular/material/card';
import {MatChipsModule} from '@angular/material/chips';
import {MatIcon} from '@angular/material/icon';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import checkIcon from '@material-symbols/svg-400/outlined/check.svg';

interface RouteChipView {
  name: string;
  recorded: boolean;
}

/**
 * Renders every active route as a chip, recorded ones checked/green and the rest neutral - the
 * actual question this panel answers is "who hasn't handed in yet", and a list of only the
 * recorded names would leave the reader to diff it against the total route count themselves.
 */
@Component({
  selector: 'tafel-recorded-route-names',
  templateUrl: 'recorded-route-names.component.html',
  styleUrls: ['recorded-route-names.component.scss'],
  imports: [
    MatCard,
    MatCardContent,
    MatChipsModule,
    MatIcon
  ]
})
export class RecordedRouteNamesComponent {
  private readonly registerIcons = registerSvgIcons({check: checkIcon});

  /** Every route still driven today, in driving order - the panel's full universe of "who has to hand in". */
  allRouteNames = input<string[] | null>(null);
  /** Names already fully recorded, from the live dashboard feed. */
  recordedRouteNames = input<string[] | null>(null);

  protected readonly routes = computed<RouteChipView[]>(() => {
    const recorded = new Set(this.recordedRouteNames() ?? []);
    return (this.allRouteNames() ?? []).map(name => ({name, recorded: recorded.has(name)}));
  });
}
