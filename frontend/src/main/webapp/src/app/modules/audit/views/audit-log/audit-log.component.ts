import {Component, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import dayjs from 'dayjs';
import {Subject, debounceTime, distinctUntilChanged} from 'rxjs';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatSelectModule} from '@angular/material/select';
import {
  AuditActorItem,
  AuditApiService,
  AuditEntriesResponse,
  auditEntityTypeLabel,
  AuditOperation,
  auditOperationLabel,
  AuditSearchFilter
} from '../../../../api/audit-api.service';
import {PAGE_SIZE_OPTIONS} from '../../../../common/api/paged-response';
import {AuditEntryListComponent} from '../../../../common/components/audit-entry-list/audit-entry-list.component';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

/**
 * The screen opens on the question it is almost always opened for: what changed on customers
 * recently. Landing on the unfiltered log would mean paging through user and settings entries to
 * get there first.
 *
 * Both defaults are a starting point, not a restriction: the record type has an "Alle" option and
 * the dates can be cleared, which is why "Filter zurücksetzen" returns here rather than to empty.
 * A link that carries filters of its own wins over them - see [FILTER_QUERY_PARAMS].
 */
const DEFAULT_ENTITY_TYPE = 'Household';
const DEFAULT_RANGE_MONTHS = 1;

/**
 * The whole filter, in the URL, so a finding can be linked to. Written on every change - including
 * as an empty value - because the presence of these parameters is what makes the link say "these
 * filters", rather than leaving a cleared filter indistinguishable from an unfiltered link that
 * would silently open on the defaults instead.
 *
 * German names, like the routes and the `quellen` parameter of the merge screen.
 */
const FILTER_QUERY_PARAMS = {
  entityType: 'art',
  operation: 'zugriff',
  actorUsername: 'benutzer',
  businessKey: 'nummer',
  from: 'von',
  to: 'bis'
} as const;

/** Long enough not to search on every keystroke of a customer number, short enough to feel immediate. */
const TEXT_FILTER_DEBOUNCE_MS = 400;

/** `yyyy-MM-dd` as a native date input expects it, taken from the local calendar rather than UTC. */
const isoDate = (date: dayjs.Dayjs): string => date.format('YYYY-MM-DD');

/** The ranges the log is almost always narrowed to, as one click instead of two date pickers. */
const DATE_PRESETS = [
  {key: 'heute', label: 'Heute', from: () => dayjs(), to: () => dayjs()},
  {key: 'woche', label: 'Letzte 7 Tage', from: () => dayjs().subtract(6, 'day'), to: () => dayjs()},
  {key: 'monat', label: 'Dieser Monat', from: () => dayjs().startOf('month'), to: () => dayjs()}
];

/**
 * The administration-wide access log: every recorded change and access across households, users and
 * settings, newest first, narrowable by record type, kind of access, acting user, record number and
 * date.
 *
 * Every filter applies itself - the log is read by refining a question ("who touched this?", "what
 * happened yesterday?"), and a separate confirmation step in between only costs a click per
 * refinement. The two typed filters wait [TEXT_FILTER_DEBOUNCE_MS] so a number is searched for once
 * rather than once per digit.
 *
 * Read-only by construction - the backend exposes no endpoint that would change or remove an entry.
 */
@Component({
  selector: 'tafel-audit-log',
  templateUrl: 'audit-log.component.html',
  imports: [
    FormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    AuditEntryListComponent
  ]
})
export class AuditLogComponent {
  protected readonly entries = signal<AuditEntriesResponse | null>(null);

  // What the role="status" region in the template says. A filter change replaces the whole list
  // below it, which is not a change a screen reader notices on its own - and with no "Suchen"
  // button to press, it is the only thing that reports the outcome of a refinement.
  protected readonly searchAnnouncement = signal('');
  protected readonly entityTypes = signal<string[]>([]);
  protected readonly operations = signal<AuditOperation[]>([]);
  protected readonly actors = signal<AuditActorItem[]>([]);

  protected readonly entityType = signal<string | null>(DEFAULT_ENTITY_TYPE);
  protected readonly operation = signal<AuditOperation | null>(null);
  protected readonly actorUsername = signal<string | null>(null);
  protected readonly businessKey = signal<string | null>(null);
  protected readonly from = signal<string | null>(isoDate(dayjs().subtract(DEFAULT_RANGE_MONTHS, 'month')));
  protected readonly to = signal<string | null>(isoDate(dayjs()));

  /**
   * What is typed into the actor box, which is not the same as the actor being filtered on: the
   * filter matches a username exactly, so it only ever changes when one is picked from the list or
   * the box is emptied. Typing narrows the list of accounts offered, nothing else.
   */
  protected readonly actorInput = signal<string>('');

  protected readonly filteredActors = computed(() => {
    const term = this.actorInput().trim().toLowerCase();
    return term
      ? this.actors().filter(actor => this.actorLabel(actor).toLowerCase().includes(term))
      : this.actors();
  });

  /** Which preset the current range happens to be, so the buttons can say which one is in effect. */
  protected readonly activePreset = computed(() => {
    const from = this.from();
    const to = this.to();
    return DATE_PRESETS.find(preset => isoDate(preset.from()) === from && isoDate(preset.to()) === to)?.key ?? null;
  });

  private readonly businessKeyInput = new Subject<string>();

  private readonly auditApiService = inject(AuditApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    this.readFilterFromQueryParams();

    this.businessKeyInput
      .pipe(debounceTime(TEXT_FILTER_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.applyFilter());

    this.auditApiService.getFilterOptions().subscribe({
      next: options => {
        this.entityTypes.set(options.entityTypes);
        this.operations.set(options.operations);
        this.actors.set(options.actors);
      },
      error: () => this.toastr.error('Fehler beim Laden der Filter', 'Fehler')
    });

    // Not applyFilter(): the URL is written by a change to a filter, so arriving on the plain menu
    // entry leaves it plain rather than immediately rewriting it with the defaults.
    this.search();
  }

  /** Always jumps back to the first page - staying on page 7 of a result set that no longer has one shows nothing. */
  protected search(page?: number, pageSize?: number) {
    const filter: AuditSearchFilter = {
      entityType: this.entityType(),
      operation: this.operation(),
      actorUsername: this.actorUsername(),
      businessKey: this.businessKey(),
      from: this.from(),
      to: this.to()
    };

    this.auditApiService.searchAuditEntries(filter, page, pageSize ?? this.entries()?.pageSize).subscribe({
      next: data => {
        this.entries.set(data);
        this.searchAnnouncement.set(
          data.totalCount === 1 ? '1 Eintrag gefunden' : `${data.totalCount} Einträge gefunden`
        );
      },
      error: () => this.toastr.error('Fehler beim Laden des Zugriffsprotokolls', 'Fehler')
    });
  }

  /** A filter changed: the list follows immediately, and so does the URL. */
  protected applyFilter() {
    this.writeFilterToQueryParams();
    this.search();
  }

  protected onBusinessKeyInput(value: string | null) {
    this.businessKey.set(value?.trim() ? value.trim() : null);
    this.businessKeyInput.next(this.businessKey() ?? '');
  }

  /**
   * Typing only narrows the offered accounts - except when the box is emptied, which is the one way
   * to say "any user" again and therefore applies at once.
   */
  protected onActorInput(value: string | null) {
    this.actorInput.set(value ?? '');
    if (!value?.trim() && this.actorUsername() !== null) {
      this.actorUsername.set(null);
      this.applyFilter();
    }
  }

  protected onActorSelected(username: string) {
    this.actorUsername.set(username);
    this.actorInput.set(username);
    this.applyFilter();
  }

  protected applyDatePreset(preset: typeof DATE_PRESETS[number]) {
    this.from.set(isoDate(preset.from()));
    this.to.set(isoDate(preset.to()));
    this.applyFilter();
  }

  /** Back to the state the screen opens in, not to an empty filter - see the note on the defaults above. */
  protected resetFilter() {
    this.entityType.set(DEFAULT_ENTITY_TYPE);
    this.operation.set(null);
    this.actorUsername.set(null);
    this.actorInput.set('');
    this.businessKey.set(null);
    this.from.set(isoDate(dayjs().subtract(DEFAULT_RANGE_MONTHS, 'month')));
    this.to.set(isoDate(dayjs()));
    this.applyFilter();
  }

  protected entityTypeLabel(entityType: string): string {
    return auditEntityTypeLabel[entityType] ?? entityType;
  }

  protected operationLabel(operation: AuditOperation): string {
    return auditOperationLabel[operation] ?? operation;
  }

  /** The username first, since that is what the filter matches; the name behind it only says who that is. */
  protected actorLabel(actor: AuditActorItem): string {
    const name = [actor.firstname, actor.lastname].filter(part => !!part).join(' ');
    return name ? `${actor.username} (${name})` : actor.username;
  }

  /**
   * A link into the log carries the whole filter, so the screen opens on what it opened on for
   * whoever shared it. Without any of the parameters - the plain menu entry - the defaults apply.
   */
  private readFilterFromQueryParams() {
    const params = this.route.snapshot.queryParamMap;
    if (!Object.values(FILTER_QUERY_PARAMS).some(param => params.has(param))) {
      return;
    }

    const value = (param: string) => params.get(param)?.trim() || null;
    this.entityType.set(value(FILTER_QUERY_PARAMS.entityType));
    this.operation.set(value(FILTER_QUERY_PARAMS.operation) as AuditOperation | null);
    this.actorUsername.set(value(FILTER_QUERY_PARAMS.actorUsername));
    this.actorInput.set(this.actorUsername() ?? '');
    this.businessKey.set(value(FILTER_QUERY_PARAMS.businessKey));
    this.from.set(value(FILTER_QUERY_PARAMS.from));
    this.to.set(value(FILTER_QUERY_PARAMS.to));
  }

  /** `replaceUrl`, so refining a filter does not fill the back button with every intermediate state. */
  private writeFilterToQueryParams() {
    this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParams: {
        [FILTER_QUERY_PARAMS.entityType]: this.entityType() ?? '',
        [FILTER_QUERY_PARAMS.operation]: this.operation() ?? '',
        [FILTER_QUERY_PARAMS.actorUsername]: this.actorUsername() ?? '',
        [FILTER_QUERY_PARAMS.businessKey]: this.businessKey() ?? '',
        [FILTER_QUERY_PARAMS.from]: this.from() ?? '',
        [FILTER_QUERY_PARAMS.to]: this.to() ?? ''
      }
    });
  }

  protected readonly datePresets = DATE_PRESETS;
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
}
