import {Component, computed, inject, input, Signal} from '@angular/core';
import {DistributionStateComponent} from './components/distribution-state/distribution-state.component';
import {RegisteredCustomersComponent} from './components/registered-customers/registered-customers.component';
import {RegisteredPersonsComponent} from './components/registered-persons/registered-persons.component';
import {TafelIfPermissionDirective} from '../../common/security/tafel-if-permission.directive';
import {
  DistributionStatisticsInputComponent
} from './components/distribution-statistics-input/distribution-statistics-input.component';
import {
  RecordedFoodCollectionsComponent
} from './components/recorded-food-collections/recorded-food-collections.component';
import {FoodAmountComponent} from './components/food-amount/food-amount.component';
import {RecordedRouteNamesComponent} from './components/recorded-route-names/recorded-route-names.component';
import {RouteProgressComponent} from './components/route-progress/route-progress.component';
import {ShelterListResponse} from '../../api/shelter-api.service';
import {
  DistributionNotesInputComponent
} from './components/distribution-notes-input/distribution-notes-input.component';
import {TicketsProcessedComponent} from './components/tickets-processed/tickets-processed.component';
import {
  LastDistributionSummaryComponent
} from './components/last-distribution-summary/last-distribution-summary.component';
import {StatTileComponent} from './components/stat-tile/stat-tile.component';
import {QuickLinksComponent} from './components/quick-links/quick-links.component';
import {SseService} from '../../common/sse/sse.service';
import {GlobalStateService} from '../../common/state/global-state.service';
import {toSignal} from '@angular/core/rxjs-interop';
import {MatDivider} from '@angular/material/list';

@Component({
  selector: 'tafel-dashboard',
  templateUrl: 'dashboard.component.html',
  // A column filling the height `<main>` was given (it is a flex column for this), so the last row
  // can take whatever the rows above it left over and the screen ends exactly at the fold - with
  // or without "Routen unterwegs". See the template.
  host: {class: 'flex min-h-0 flex-1 flex-col'},
  imports: [
    DistributionStateComponent,
    RegisteredCustomersComponent,
    RegisteredPersonsComponent,
    TafelIfPermissionDirective,
    DistributionStatisticsInputComponent,
    RecordedFoodCollectionsComponent,
    RecordedRouteNamesComponent,
    RouteProgressComponent,
    FoodAmountComponent,
    DistributionNotesInputComponent,
    TicketsProcessedComponent,
    LastDistributionSummaryComponent,
    StatTileComponent,
    QuickLinksComponent,
    MatDivider,
  ]
})

export class DashboardComponent {
  private readonly sseService = inject(SseService);
  private readonly globalStateService = inject(GlobalStateService);

  readonly sheltersData = input<ShelterListResponse>();

  readonly data: Signal<DashboardData | undefined> = toSignal(
    this.sseService.listen<DashboardData>('/sse/dashboard')
  );

  /**
   * Whether a distribution is currently open - read from `GlobalStateService` rather than derived
   * locally, so this stays in sync with every other module reading the same `/sse/distributions`
   * stream (see the module README). Drives which half of the template is shown: the day-specific
   * panels while active, a summary of the last closed distribution otherwise.
   */
  readonly isDistributionActive = computed(() => {
    const distribution = this.globalStateService.getCurrentDistribution()();
    return !!distribution && !distribution.endedAt;
  });

  /**
   * The route progress, or `undefined` while nothing has been ticked off today - the template
   * leaves the panel out entirely in that case, see the comment there.
   */
  readonly routeProgress = computed(() => {
    const progress = this.data()?.logistics?.routeProgress;
    return progress?.length ? progress : undefined;
  });

}

export interface DashboardData {
  registeredCustomers?: number;
  /** everyone the registered households get food for: main persons plus their not-excluded additional persons */
  registeredPersons?: number;
  tickets?: DashboardTicketsData;
  statistics?: DashboardStatisticsData;
  logistics?: DashboardLogisticsData;
  notes?: string;
  /** Only set while no distribution is currently open - see {@link DashboardComponent.isDistributionActive}. */
  lastDistribution?: DashboardLastDistributionData;
  /** Only set while no distribution is currently open - see {@link DashboardComponent.isDistributionActive}. */
  organizationOverview?: DashboardOrganizationOverviewData;
}

export interface DashboardTicketsData {
  countProcessedTickets?: number;
  countTotalTickets?: number;
}

export interface DashboardStatisticsData {
  employeeCount?: number;
  selectedShelterNames?: string[];
}

export interface DashboardLogisticsData {
  foodCollectionsRecordedCount?: number;
  foodCollectionsTotalCount?: number;
  recordedRouteNames?: string[];
  allRouteNames?: string[];
  foodAmountTotal?: number;
  routeProgress?: DashboardRouteProgressData[];
}

export interface DashboardRouteProgressData {
  routeId: number;
  routeNumber: number;
  routeName: string;
  completedStops: number;
  totalStops: number;
}

export interface DashboardLastDistributionData {
  date: Date;
  registeredCustomers: number;
  registeredPersons: number;
  countProcessedTickets: number;
  foodAmountTotal: number;
}

export interface DashboardOrganizationOverviewData {
  activeHouseholdsCount: number;
  activePersonsCount: number;
  activeUsersCount: number;
  activeCarsCount: number;
  activeSheltersCount: number;
  activeRoutesCount: number;
  activeShopsCount: number;
  employeesCount: number;
}
