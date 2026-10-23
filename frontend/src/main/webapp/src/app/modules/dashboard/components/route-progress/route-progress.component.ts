import {Component, computed, input} from '@angular/core';
import {MatCard, MatCardContent} from '@angular/material/card';
import {MatIcon} from '@angular/material/icon';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import homeIcon from '@material-symbols/svg-400/outlined/home-fill.svg';
import {DashboardRouteProgressData} from '../../dashboard.component';

interface RouteProgressView {
  routeId: number;
  routeName: string;
  completedStops: number;
  totalStops: number;
  completedShelters: number;
  totalShelters: number;
  // stops and shelters together
  completed: number;
  total: number;
  percent: number;
  done: boolean;
  label: string;
  /**
   * one entry per stop of the route in driving order, then one per shelter picked for it today -
   * `done` once the stop has been ticked off or the delivery confirmed
   */
  segments: {done: boolean; shelter: boolean}[];
}

/**
 * How far each route has got today, from the stops the drivers tick off in the route guidance
 * screen. This is the office's side of that screen: it answers "where is route 3 right now"
 * without anyone having to ring the van.
 *
 * One compact line per route, several per row: the dashboard is meant to be read on one screen
 * without scrolling, which a stacked list of full-width bars does not leave room for. There is no
 * empty state, because the dashboard only renders this panel once a route has progress to show -
 * see `dashboard.component.html`.
 */
@Component({
  selector: 'tafel-route-progress',
  templateUrl: 'route-progress.component.html',
  imports: [
    MatCard,
    MatCardContent,
    MatIcon
  ]
})
export class RouteProgressComponent {
  private readonly registerIcons = registerSvgIcons({home: homeIcon});

  routeProgress = input<DashboardRouteProgressData[] | null>(null);

  protected readonly routes = computed<RouteProgressView[]>(() =>
    (this.routeProgress() ?? []).map(route => {
      const completedShelters = route.completedShelters ?? 0;
      const totalShelters = route.totalShelters ?? 0;
      // never 0 - the backend leaves out a route with neither stops nor shelters today
      const total = route.totalStops + totalShelters;
      const completed = route.completedStops + completedShelters;
      return {
        routeId: route.routeId,
        routeName: route.routeName,
        completedStops: route.completedStops,
        totalStops: route.totalStops,
        completedShelters,
        totalShelters,
        completed,
        total,
        percent: Math.round((completed / total) * 100),
        done: completed >= total,
        // the bar itself carries no text, so the accessible name has to say both what is
        // measured and how far it has got
        label: totalShelters > 0
          ? `${route.routeName}: ${route.completedStops} von ${route.totalStops} Stopps erledigt, `
            + `${completedShelters} von ${totalShelters} Notschlafstellen beliefert`
          : `${route.routeName}: ${route.completedStops} von ${route.totalStops} Stopps erledigt`,
        segments: [
          ...Array.from({length: route.totalStops}, (_, index) => ({done: index < route.completedStops, shelter: false})),
          ...Array.from({length: totalShelters}, (_, index) => ({done: index < completedShelters, shelter: true}))
        ]
      };
    })
  );
}
