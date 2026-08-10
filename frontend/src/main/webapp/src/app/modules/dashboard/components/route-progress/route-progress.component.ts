import {Component, computed, input} from '@angular/core';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatProgressBar} from '@angular/material/progress-bar';
import {DashboardRouteProgressData} from '../../dashboard.component';

interface RouteProgressView {
  routeId: number;
  routeName: string;
  completedStops: number;
  totalStops: number;
  percent: number;
  done: boolean;
  label: string;
}

/**
 * How far each route has got today, from the stops the drivers tick off in the route guidance
 * screen. This is the office's side of that screen: it answers "where is route 3 right now"
 * without anyone having to ring the van.
 */
@Component({
  selector: 'tafel-route-progress',
  templateUrl: 'route-progress.component.html',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatProgressBar
  ]
})
export class RouteProgressComponent {
  routeProgress = input<DashboardRouteProgressData[] | null>(null);

  protected readonly routes = computed<RouteProgressView[]>(() =>
    (this.routeProgress() ?? []).map(route => ({
      routeId: route.routeId,
      routeName: route.routeName,
      completedStops: route.completedStops,
      totalStops: route.totalStops,
      // totalStops is never 0 - the backend leaves routes without stops out entirely
      percent: Math.round((route.completedStops / route.totalStops) * 100),
      done: route.completedStops >= route.totalStops,
      // the bar itself carries no text, so the accessible name has to say both what is
      // measured and how far it has got
      label: `${route.routeName}: ${route.completedStops} von ${route.totalStops} Stopps erledigt`
    }))
  );
}
