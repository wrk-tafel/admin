import {Component, computed, inject, signal, WritableSignal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {catchError, debounceTime, distinctUntilChanged, EMPTY, filter, map, Observable, Subject, switchMap} from 'rxjs';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import dayjs from 'dayjs';
import {CustomerApiService, CustomerData, CustomerSearchResult} from '../../../../api/customer-api.service';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatTableModule} from '@angular/material/table';
import {MatDividerModule} from '@angular/material/divider';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatChipsModule} from '@angular/material/chips';
import {CommonModule} from '@angular/common';
import {faLock, faPencil, faUser} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {FormatCustomerAddressPipe} from '../../../../common/pipes/format-customer-address.pipe';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../../../common/http/suppress-error-toast.token';
import {DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS} from '../../../../common/api/paged-response';
import {TafelInfoTooltipComponent} from '../../../../common/components/tafel-info-tooltip/tafel-info-tooltip.component';

/** Long enough not to search on every keystroke, short enough to still feel immediate. */
const SEARCH_DEBOUNCE_MS = 300;

/** Live search-as-you-type only kicks in from here; shorter input still searches through Enter/"Suchen". */
const MIN_LIVE_SEARCH_CHARS = 2;

/**
 * The whole search state, in the URL, so the result list survives a detour to a customer and back -
 * the "search → open → back → open next" loop is the most common one on this screen.
 *
 * German names, like the audit log's filter params.
 */
const QUERY_PARAMS = {
  query: 'suche',
  postProcessing: 'unvollstaendig',
  costContribution: 'unkostenbeitrag',
  valid: 'bezugsberechtigt',
  page: 'seite',
  pageSize: 'anzahl',
} as const;

/**
 * Primary lookup for households: one omnibox that either jumps straight to a customer (a pure
 * number matching an existing customer id) or runs the fuzzy free-text search the backend indexes
 * via `search_text` - see [resolveSearch$]. Filters are chip toggles and the whole state (query,
 * filters, page) lives in the URL so navigating away and back restores the same result list.
 */
@Component({
  selector: 'tafel-customer-search',
  templateUrl: 'customer-search.component.html',
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatDividerModule,
    MatPaginatorModule,
    MatChipsModule,
    CommonModule,
    FaIconComponent,
    TafelAutofocusDirective,
    FormatCustomerAddressPipe,
    MatTooltipModule,
    TafelInfoTooltipComponent,
    RouterLink
  ]
})
export class CustomerSearchComponent {
  private readonly customerApiService = inject(CustomerApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastr = inject(TafelToastrService);

  /** The one search box. A pure number is tried as an exact customer-id jump first - see [resolveSearch$]. */
  query = signal('');
  postProcessing = signal(false);
  costContribution = signal(false);
  valid = signal(false);

  // Use a signal so the template-sugar (@if / @for) reacts immediately when updated
  searchResult = signal<CustomerSearchResult | undefined>(undefined);

  // What the role="status" region in the template says. A search replaces the whole result table,
  // which is not a change a screen reader notices on its own.
  searchAnnouncement = signal('');

  /**
   * Every search goes through this subject instead of subscribing per call, so that a newer search
   * cancels the one still in flight - see the constructor.
   */
  private readonly searches = new Subject<CustomerSearchRequest>();

  /** Drives the debounced search-as-you-type; a raw keystroke does not by itself trigger a request. */
  private readonly queryInput = new Subject<string>();

  /**
   * The query the latest dispatched search ran with. The debounced search-as-you-type checks
   * against it so an explicit search (button/Enter) absorbs the debounce still pending for the
   * same input - otherwise every explicit search right after typing fired a second, identical
   * request whose response replaced the result list a moment later (same fix as the user search).
   */
  private lastDispatchedQuery: string | null = null;

  constructor() {
    this.searches
      .pipe(
        switchMap(request => this.resolveSearch$(request)),
        takeUntilDestroyed(),
      )
      .subscribe(outcome => this.applyOutcome(outcome));

    this.queryInput
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        filter(value => value.trim().length === 0 || value.trim().length >= MIN_LIVE_SEARCH_CHARS),
        filter(value => value.trim() !== this.lastDispatchedQuery),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.search());

    // A link into this screen carries its whole state (query, filters, page) - see QUERY_PARAMS.
    // Without any of them present (the plain menu entry), land on the unfiltered first page instead.
    const restored = this.readStateFromQueryParams();
    this.dispatchSearch({
      page: restored?.page,
      pageSize: restored?.pageSize,
      announceOutcome: false,
      tryExactMatch: false,
      writeParams: false,
    });
  }

  onQueryInput(value: string) {
    this.query.set(value);
    this.queryInput.next(value);
  }

  /** Always jumps back to the first page unless a paginator click passes one explicitly. */
  search(page?: number, pageSize?: number, announceOutcome = true, tryExactMatch = true) {
    this.dispatchSearch({page, pageSize, announceOutcome, tryExactMatch, writeParams: true});
  }

  toggleFilter(filterSignal: WritableSignal<boolean>, selected: boolean) {
    filterSignal.set(selected);
    // A filter refines the current (already fuzzy) result - it must never trigger the exact-id jump.
    this.search(undefined, undefined, true, false);
  }

  private dispatchSearch(request: CustomerSearchRequest) {
    this.lastDispatchedQuery = this.query().trim();
    this.searches.next(request);
  }

  /**
   * A pure-number query is tried as an exact customer-id jump first (the former "Anzeigen" flow) -
   * only once that misses does it fall back to the fuzzy search, using the digits as search text,
   * since the backend indexes the customer number inside `search_text` too. Filter/page-only
   * requests never attempt the jump: refining an already-fuzzy result must not suddenly navigate
   * away underneath the user.
   */
  private resolveSearch$(request: CustomerSearchRequest): Observable<SearchOutcome> {
    const query = this.query().trim();

    if (request.tryExactMatch && /^\d+$/.test(query)) {
      const customerId = Number(query);
      return this.customerApiService.getCustomer(customerId, SUPPRESS_ERROR_TOAST_CONTEXT).pipe(
        map(customer => ({type: 'navigate' as const, customerId: customer.id ?? customerId})),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return this.fuzzySearch$(request, query);
          }
          this.toastr.error('Fehler beim Laden des Kunden!');
          return EMPTY;
        }),
      );
    }

    return this.fuzzySearch$(request, query);
  }

  private fuzzySearch$(request: CustomerSearchRequest, query: string): Observable<SearchOutcome> {
    return this.customerApiService.searchCustomer(
      query || undefined,
      this.postProcessing() || undefined,
      this.costContribution() || undefined,
      this.valid() || undefined,
      request.page,
      request.pageSize,
    ).pipe(
      map(response => ({
        type: 'result' as const,
        response,
        announceOutcome: request.announceOutcome,
        writeParams: request.writeParams,
      })),
      // Caught here so a failed search ends only itself: the subject's stream stays open for the
      // next one, same as the exact-id lookup's own catchError above.
      catchError(() => EMPTY),
    );
  }

  private applyOutcome(outcome: SearchOutcome) {
    if (outcome.type === 'navigate') {
      this.navigateToCustomerDetail(outcome.customerId);
      return;
    }

    this.searchResult.set(outcome.response);
    if (outcome.announceOutcome) {
      this.searchAnnouncement.set(
        outcome.response.totalCount === 0
          ? 'Keine Kunden gefunden'
          : outcome.response.totalCount === 1
            ? '1 Kunde gefunden'
            : `${outcome.response.totalCount} Kunden gefunden`
      );
    }
    if (outcome.writeParams) {
      this.writeStateToQueryParams(outcome.response);
    }
  }

  private navigateToCustomerDetail(customerId: number) {
    return this.router.navigate(['/kunden/detail', customerId]);
  }

  navigateToCustomer(customerId: number) {
    this.navigateToCustomerDetail(customerId);
  }

  editCustomer(customerId: number) {
    this.router.navigate(['/kunden/bearbeiten', customerId]);
  }

  isValid(customer: CustomerData): boolean {
    return !!customer.validUntil && !dayjs(customer.validUntil).startOf('day').isBefore(dayjs().startOf('day'));
  }

  /**
   * Prefills "Kunden anlegen" from the current query where that is plausible: a name, not a
   * customer number that just did not match anything. Two-or-more words are read as first name(s)
   * plus surname; a single word goes to the surname field alone, since that is what most searches
   * on this screen are narrowed to.
   */
  createCustomerQueryParams = computed(() => {
    const trimmed = this.query().trim();
    if (!trimmed || /^\d+$/.test(trimmed)) {
      return {};
    }
    const [first, ...rest] = trimmed.split(/\s+/);
    return rest.length > 0 ? {vorname: first, nachname: rest.join(' ')} : {nachname: first};
  });

  private readStateFromQueryParams(): { page?: number; pageSize?: number } | null {
    const params = this.route.snapshot.queryParamMap;
    if (!Object.values(QUERY_PARAMS).some(param => params.has(param))) {
      return null;
    }

    this.query.set(params.get(QUERY_PARAMS.query) ?? '');
    this.postProcessing.set(params.get(QUERY_PARAMS.postProcessing) === 'true');
    this.costContribution.set(params.get(QUERY_PARAMS.costContribution) === 'true');
    this.valid.set(params.get(QUERY_PARAMS.valid) === 'true');

    const page = Number(params.get(QUERY_PARAMS.page));
    const pageSize = Number(params.get(QUERY_PARAMS.pageSize));
    return {
      page: Number.isInteger(page) && page > 0 ? page : undefined,
      pageSize: Number.isInteger(pageSize) && pageSize > 0 ? pageSize : undefined,
    };
  }

  /** `replaceUrl`, so refining a search does not fill the back button with every intermediate state. */
  private writeStateToQueryParams(response: CustomerSearchResult) {
    this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParams: {
        [QUERY_PARAMS.query]: this.query().trim() || null,
        [QUERY_PARAMS.postProcessing]: this.postProcessing() ? 'true' : null,
        [QUERY_PARAMS.costContribution]: this.costContribution() ? 'true' : null,
        [QUERY_PARAMS.valid]: this.valid() ? 'true' : null,
        [QUERY_PARAMS.page]: response.currentPage > 1 ? response.currentPage : null,
        [QUERY_PARAMS.pageSize]: response.pageSize !== DEFAULT_PAGE_SIZE ? response.pageSize : null,
      }
    });
  }

  // columns for mat-table
  displayedColumns = ['icon', 'id', 'name', 'birthDate', 'address', 'personsCount', 'issuedAt', 'validUntil', 'actions'];

  protected readonly faPencil = faPencil;
  protected readonly faUser = faUser;
  protected readonly faLock = faLock;
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
}

/** One queued search - the filters themselves are read off the signals when the request is resolved. */
interface CustomerSearchRequest {
  page?: number;
  pageSize?: number;
  announceOutcome: boolean;
  tryExactMatch: boolean;
  writeParams: boolean;
}

type SearchOutcome =
  | { type: 'navigate'; customerId: number }
  | { type: 'result'; response: CustomerSearchResult; announceOutcome: boolean; writeParams: boolean };
