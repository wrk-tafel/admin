import {Component, computed, input} from '@angular/core';
import {MatCard, MatCardContent} from '@angular/material/card';
import {MatChipsModule} from '@angular/material/chips';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCheck} from '@fortawesome/free-solid-svg-icons';

interface RouteChipView {
  name: string;
  recorded: boolean;
}

/**
 * "Erfasste Routen" used to list only the routes already recorded - which meant reading it always
 * meant mentally diffing it against the total route count to answer the actual question: who
 * hasn't handed in yet. Rendering every active route as a chip, recorded ones checked/green and the
 * rest neutral, answers that directly.
 */
@Component({
  selector: 'tafel-recorded-route-names',
  templateUrl: 'recorded-route-names.component.html',
  imports: [
    MatCard,
    MatCardContent,
    MatChipsModule,
    FaIconComponent
  ]
})
export class RecordedRouteNamesComponent {
  /** Every route still driven today, in driving order - the panel's full universe of "who has to hand in". */
  allRouteNames = input<string[] | null>(null);
  /** Names already fully recorded, from the live dashboard feed. */
  recordedRouteNames = input<string[] | null>(null);

  protected readonly routes = computed<RouteChipView[]>(() => {
    const recorded = new Set(this.recordedRouteNames() ?? []);
    return (this.allRouteNames() ?? []).map(name => ({name, recorded: recorded.has(name)}));
  });

  protected readonly faCheck = faCheck;
}
