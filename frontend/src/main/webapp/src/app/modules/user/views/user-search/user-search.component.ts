import {Component, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {catchError, debounceTime, distinctUntilChanged, EMPTY, filter, map, Observable, Subject, switchMap} from 'rxjs';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import {UserApiService, UserData, UserSearchResult} from '../../../../api/user-api.service';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatTableModule} from '@angular/material/table';
import {MatDividerModule} from '@angular/material/divider';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatChipsModule, MatChipSelectionChange} from '@angular/material/chips';
import {CommonModule} from '@angular/common';
import {MatIcon} from '@angular/material/icon';
import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../../../common/http/suppress-error-toast.token';
import {DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS} from '../../../../common/api/paged-response';
import {TafelInfoTooltipComponent} from '../../../../common/components/tafel-info-tooltip/tafel-info-tooltip.component';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import lockIcon from '@material-symbols/svg-400/outlined/lock-fill.svg';
import personIcon from '@material-symbols/svg-400/outlined/person-fill.svg';
import editIcon from '@material-symbols/svg-400/outlined/edit-fill.svg';

/** Long enough not to search on every keystroke, short enough to still feel immediate. */
const SEARCH_DEBOUNCE_MS = 300;

/** Live search-as-you-type only kicks in from here; shorter input still searches through Enter/"Suchen". */
const MIN_LIVE_SEARCH_CHARS = 2;

type StatusFilter = 'alle' | 'aktiv' | 'deaktiviert';

/**
 * The whole search state, in the URL, so the result list survives a detour to a user's detail and
 * back - the "search → open → back → open next" loop is the most common one on this screen.
 *
 * German names, like the audit log's filter params and the customer search's own QUERY_PARAMS.
 */
const QUERY_PARAMS = {
  query: 'suche',
  status: 'status',
  page: 'seite',
  pageSize: 'anzahl',
} as const;

/**
 * Admin lookup of application accounts: one omnibox that either jumps straight to a user (an exact
 * personnel-number match) or runs the fuzzy free-text search the backend indexes via `search_text`
 * - see [resolveSearch$]. The "Aktiv" filter is a chip toggle (Alle | Aktiv | Deaktiviert) rather
 * than a checkbox, and the whole state (query, status, page) lives in the URL so navigating away
 * and back restores the same result list. Mirrors the customer search's rework - see its README
 * note before diverging from these patterns.
 */
@Component({
  selector: 'tafel-user-search',
  templateUrl: 'user-search.component.html',
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
    MatIcon,
    TafelAutofocusDirective,
    MatTooltipModule,
    TafelInfoTooltipComponent,
    RouterLink
  ]
})
export class UserSearchComponent {
  private readonly registerIcons = registerSvgIcons({lock: lockIcon, person: personIcon, edit: editIcon});

  private readonly userApiService = inject(UserApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastr = inject(TafelToastrService);

  /** The one search box. A pure number is tried as an exact personnel-number jump first - see [resolveSearch$]. */
  query = signal('');
  /** Kept at 'aktiv' as the default landing state - the same default the previous checkbox started at. */
  statusFilter = signal<StatusFilter>('aktiv');

  // Use a signal so the template-sugar (@if / @for) reacts immediately when updated
  searchResult = signal<UserSearchResult | undefined>(undefined);

  // What the role="status" region in the template says. A search replaces the whole result table,
  // which is not a change a screen reader notices on its own.
  searchAnnouncement = signal('');

  /**
   * Every search goes through this subject instead of subscribing per call, so that a newer search
   * cancels the one still in flight - see the constructor.
   */
  private readonly searches = new Subject<UserSearchRequest>();

  /** Drives the debounced search-as-you-type; a raw keystroke does not by itself trigger a request. */
  private readonly queryInput = new Subject<string>();

  /**
   * The query the latest dispatched search ran with. The debounced search-as-you-type checks
   * against it so an explicit search (button/Enter) absorbs the debounce still pending for the
   * same input - otherwise every explicit search right after typing fired a second, identical
   * request whose response replaced the result list a moment later.
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
      // tryExactMatch: false - a personnel number is very often typed in stages (the debounce can
      // settle between digits), so live search-as-you-type must never navigate away on what could
      // still be a mid-typed prefix that happens to already match a different, shorter personnel
      // number. The exact-id jump only fires on an explicit Enter/"Suchen", once the number is
      // actually finished; until then, live search still finds it - see customer-search's identical
      // fix (issue #3533).
      .subscribe(() => this.search(undefined, undefined, true, false));

    // A link into this screen carries its whole state (query, status, page) - see QUERY_PARAMS.
    // Without any of them present (the plain menu entry), land on the default (active users) first
    // page instead.
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

  /**
   * `mat-chip-option`'s `selected` setter fires `selectionChange` on *any* change to the property
   * binding, not just a click - including the very first render, when `[selected]="statusFilter()
   * === '...'"` first applies and differs from the chip's own initial `false`. `isUserInput` is
   * `false` for that case (and for any other programmatic change) and `true` only for an actual
   * click/keypress (`selectViaInteraction()`), which is what this must key off - reacting to
   * `selected` alone would re-run the current search on every initial render.
   */
  onStatusFilterChange(value: StatusFilter, event: MatChipSelectionChange) {
    if (!event.isUserInput || !event.selected) {
      return;
    }
    this.statusFilter.set(value);
    // A filter refines the current (already fuzzy) result - it must never trigger the exact-match jump.
    this.search(undefined, undefined, true, false);
  }

  private dispatchSearch(request: UserSearchRequest) {
    this.lastDispatchedQuery = this.query().trim();
    this.searches.next(request);
  }

  /**
   * A pure-number query is tried as an exact personnel-number jump first (the former "Anzeigen"
   * flow) - only once that misses does it fall back to the fuzzy search, using the digits as search
   * text, since the backend indexes the personnel number inside `search_text` too. Filter/page-only
   * requests never attempt the jump: refining an already-fuzzy result must not suddenly navigate
   * away underneath the user.
   */
  private resolveSearch$(request: UserSearchRequest): Observable<SearchOutcome> {
    const query = this.query().trim();

    if (request.tryExactMatch && /^\d+$/.test(query)) {
      return this.userApiService.getUserForPersonnelNumber(query, SUPPRESS_ERROR_TOAST_CONTEXT).pipe(
        map(user => ({type: 'navigate' as const, userId: user.id!})),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return this.fuzzySearch$(request, query);
          }
          this.toastr.error('Fehler beim Laden des Benutzers!');
          return EMPTY;
        }),
      );
    }

    return this.fuzzySearch$(request, query);
  }

  private fuzzySearch$(request: UserSearchRequest, query: string): Observable<SearchOutcome> {
    return this.userApiService.searchUser(
      query || undefined,
      this.resolveEnabledParam(),
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
      // next one, same as the exact-match lookup's own catchError above.
      catchError(() => EMPTY),
    );
  }

  private resolveEnabledParam(): boolean | undefined {
    switch (this.statusFilter()) {
      case 'aktiv':
        return true;
      case 'deaktiviert':
        return false;
      default:
        return undefined;
    }
  }

  private applyOutcome(outcome: SearchOutcome) {
    if (outcome.type === 'navigate') {
      this.navigateToUserDetail(outcome.userId);
      return;
    }

    this.searchResult.set(outcome.response);
    if (outcome.announceOutcome) {
      this.searchAnnouncement.set(
        outcome.response.totalCount === 0
          ? 'Keine Benutzer gefunden'
          : outcome.response.totalCount === 1
            ? '1 Benutzer gefunden'
            : `${outcome.response.totalCount} Benutzer gefunden`
      );
    }
    if (outcome.writeParams) {
      this.writeStateToQueryParams(outcome.response);
    }
  }

  navigateToUserDetail(userId: number | undefined) {
    return this.router.navigate(['/benutzer/detail', userId]);
  }

  editUser(userId: number | undefined) {
    this.router.navigate(['/benutzer/bearbeiten', userId]);
  }

  isLocked(user: UserData): boolean {
    return !!user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now();
  }

  private readStateFromQueryParams(): { page?: number; pageSize?: number } | null {
    const params = this.route.snapshot.queryParamMap;
    if (!Object.values(QUERY_PARAMS).some(param => params.has(param))) {
      return null;
    }

    this.query.set(params.get(QUERY_PARAMS.query) ?? '');
    const status = params.get(QUERY_PARAMS.status);
    this.statusFilter.set(status === 'alle' || status === 'deaktiviert' ? status : 'aktiv');

    const page = Number(params.get(QUERY_PARAMS.page));
    const pageSize = Number(params.get(QUERY_PARAMS.pageSize));
    return {
      page: Number.isInteger(page) && page > 0 ? page : undefined,
      pageSize: Number.isInteger(pageSize) && pageSize > 0 ? pageSize : undefined,
    };
  }

  /** `replaceUrl`, so refining a search does not fill the back button with every intermediate state. */
  private writeStateToQueryParams(response: UserSearchResult) {
    this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParams: {
        [QUERY_PARAMS.query]: this.query().trim() || null,
        // 'aktiv' is the default landing state - omitted so a default search keeps a clean URL.
        [QUERY_PARAMS.status]: this.statusFilter() !== 'aktiv' ? this.statusFilter() : null,
        [QUERY_PARAMS.page]: response.currentPage > 1 ? response.currentPage : null,
        [QUERY_PARAMS.pageSize]: response.pageSize !== DEFAULT_PAGE_SIZE ? response.pageSize : null,
      }
    });
  }

  // columns for mat-table
  displayedColumns = ['icon', 'id', 'name', 'personnelNumber', 'status', 'actions'];

  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
}

/** One queued search - the filter itself is read off the signal when the request is resolved. */
interface UserSearchRequest {
  page?: number;
  pageSize?: number;
  announceOutcome: boolean;
  tryExactMatch: boolean;
  writeParams: boolean;
}

type SearchOutcome =
  | { type: 'navigate'; userId: number }
  | { type: 'result'; response: UserSearchResult; announceOutcome: boolean; writeParams: boolean };
