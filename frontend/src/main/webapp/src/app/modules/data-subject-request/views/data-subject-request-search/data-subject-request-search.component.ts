import {Component, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {HttpErrorResponse, HttpResponse} from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDialog} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIcon} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatTooltipModule} from '@angular/material/tooltip';
import {Subject, debounceTime, distinctUntilChanged} from 'rxjs';
import searchIcon from '@material-symbols/svg-400/outlined/search-fill.svg';
import downloadIcon from '@material-symbols/svg-400/outlined/download-fill.svg';
import deleteIcon from '@material-symbols/svg-400/outlined/delete-fill.svg';
import {
  DataSubjectDeleteResponse,
  DataSubjectMatch,
  DataSubjectMatchItem,
  DataSubjectMatchType,
  DataSubjectRequestApiService,
  dataSubjectMatchTypeLabel
} from '../../../../api/data-subject-request-api.service';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {AuthenticationService} from '../../../../common/security/authentication.service';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import {
  DataSubjectRequestDeleteConfirmDialogComponent,
  DataSubjectRequestDeleteConfirmDialogData
} from './dialogs/data-subject-request-delete-confirm-dialog.component';

/** Long enough not to search on every keystroke of a name, short enough to feel immediate. */
const SEARCH_DEBOUNCE_MS = 400;

/** Below this, a search across three tables' trigram indexes would mostly return noise. */
const MIN_SEARCH_CHARS = 2;

/**
 * Which permission the export/delete action for a match actually needs - `DATA_SUBJECT_REQUESTS`
 * only grants reaching this screen (additive permission model, issue #3396), the area permission
 * behind it decides whether a *specific* selected match can be acted on.
 */
const AREA_PERMISSION_BY_TYPE: Record<DataSubjectMatchType, string> = {
  CUSTOMER: 'CUSTOMER',
  USER_ACCOUNT: 'USER_MANAGEMENT',
  EMPLOYEE_WITHOUT_ACCOUNT: 'SETTINGS'
};

/**
 * The central "Datenauskunft" screen (issue #3396): one search box across households, user
 * accounts and employees without one, so a data-subject request ("what do you have on me?") no
 * longer means guessing which of the three categories someone falls into and searching three
 * separate screens. Export and delete both reuse the household/user/employee area's own existing
 * flow per selected match - this screen only ties them together, it doesn't add a new export format
 * or a new deletion path.
 */
@Component({
  selector: 'tafel-data-subject-request-search',
  templateUrl: 'data-subject-request-search.component.html',
  imports: [FormsModule, MatButtonModule, MatCardModule, MatCheckboxModule, MatFormFieldModule, MatIcon, MatInputModule, MatTooltipModule]
})
export class DataSubjectRequestSearchComponent {
  private readonly registerIcons = registerSvgIcons({search: searchIcon, download: downloadIcon, delete: deleteIcon});

  protected readonly searchInput = signal('');
  protected readonly matches = signal<DataSubjectMatchItem[] | null>(null);
  protected readonly selectedKeys = signal<ReadonlySet<string>>(new Set());
  protected readonly exporting = signal(false);
  protected readonly deleting = signal(false);

  /** What the role="status" region says - a search replaces the whole result list, which a screen reader doesn't notice on its own. */
  protected readonly searchAnnouncement = signal('');

  protected readonly groupedMatches = computed(() => {
    const items = this.matches() ?? [];
    return (Object.keys(dataSubjectMatchTypeLabel) as DataSubjectMatchType[])
      .map(type => ({type, label: dataSubjectMatchTypeLabel[type], items: items.filter(item => item.type === type)}))
      .filter(group => group.items.length > 0);
  });

  protected readonly selectedMatches = computed(() => (this.matches() ?? []).filter(item => this.selectedKeys().has(this.matchKey(item))));

  private readonly searchInput$ = new Subject<string>();

  private readonly dataSubjectRequestApiService = inject(DataSubjectRequestApiService);
  private readonly authenticationService = inject(AuthenticationService);
  private readonly fileHelperService = inject(FileHelperService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  constructor() {
    this.searchInput$
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(value => this.runSearch(value));
  }

  protected onSearchInput(value: string) {
    this.searchInput.set(value);
    this.searchInput$.next(value);
  }

  protected matchKey(match: DataSubjectMatch): string {
    return `${match.type}-${match.id}`;
  }

  protected canActOn(match: DataSubjectMatchItem): boolean {
    return this.authenticationService.hasPermission(AREA_PERMISSION_BY_TYPE[match.type]);
  }

  protected toggleSelection(match: DataSubjectMatchItem) {
    if (!this.canActOn(match)) {
      return;
    }

    const key = this.matchKey(match);
    const next = new Set(this.selectedKeys());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.selectedKeys.set(next);
  }

  protected isSelected(match: DataSubjectMatchItem): boolean {
    return this.selectedKeys().has(this.matchKey(match));
  }

  /** Downloads the GDPR Art. 15/20 combined data takeout for every selected match, as one ZIP. */
  protected exportSelected() {
    const matches = this.selectedMatches().map(item => ({type: item.type, id: item.id}));
    this.exporting.set(true);
    this.dataSubjectRequestApiService.exportMatches(matches).subscribe({
      next: response => this.processFileResponse(response),
      error: (error: HttpErrorResponse) => {
        this.exporting.set(false);
        this.toastr.error(extractErrorMessage(error), 'Datenexport fehlgeschlagen');
      },
      complete: () => this.exporting.set(false)
    });
  }

  /** The GDPR Art. 17 erasure for every selected match, after one shared confirmation. */
  protected deleteSelected() {
    const selected = this.selectedMatches();
    const dialogData: DataSubjectRequestDeleteConfirmDialogData = {
      matches: selected.map(item => ({type: item.type, name: item.name, businessKey: item.businessKey}))
    };

    this.dialog.open(DataSubjectRequestDeleteConfirmDialogComponent, {data: dialogData})
      .afterClosed().subscribe(confirmed => {
        if (!confirmed) {
          return;
        }

        const matches = selected.map(item => ({type: item.type, id: item.id}));
        this.deleting.set(true);
        this.dataSubjectRequestApiService.deleteMatches(matches).subscribe({
          next: response => this.handleDeleteResponse(response),
          error: (error: HttpErrorResponse) => {
            this.deleting.set(false);
            this.toastr.error(extractErrorMessage(error), 'Löschen fehlgeschlagen');
          },
          complete: () => this.deleting.set(false)
        });
      });
  }

  private handleDeleteResponse(response: DataSubjectDeleteResponse) {
    const deletedKeys = new Set(
      response.results.filter(result => result.outcome === 'DELETED').map(result => this.matchKey(result.match))
    );

    this.matches.update(items => (items ?? []).filter(item => !deletedKeys.has(this.matchKey(item))));
    this.selectedKeys.set(new Set());

    if (deletedKeys.size > 0) {
      this.toastr.success(deletedKeys.size === 1 ? '1 Eintrag gelöscht' : `${deletedKeys.size} Einträge gelöscht`, 'Erfolgreich');
    }

    const alreadyGoneCount = response.results.length - deletedKeys.size;
    if (alreadyGoneCount > 0) {
      this.toastr.error(
        alreadyGoneCount === 1 ? 'Ein Eintrag war bereits gelöscht.' : `${alreadyGoneCount} Einträge waren bereits gelöscht.`,
        'Hinweis'
      );
    }
  }

  private runSearch(value: string) {
    const term = value.trim();
    if (term.length < MIN_SEARCH_CHARS) {
      this.matches.set(null);
      this.selectedKeys.set(new Set());
      return;
    }

    this.dataSubjectRequestApiService.search(term).subscribe({
      next: response => {
        this.matches.set(response.items);
        this.selectedKeys.set(new Set());
        this.searchAnnouncement.set(response.items.length === 1 ? '1 Treffer gefunden' : `${response.items.length} Treffer gefunden`);
      },
      error: () => this.toastr.error('Suche fehlgeschlagen!')
    });
  }

  private processFileResponse(response: HttpResponse<Blob>) {
    const contentDisposition = response.headers.get('content-disposition')!;
    const filename = contentDisposition.split(';')[1].split('filename')[1].split('=')[1].trim();
    this.fileHelperService.downloadFile(filename, response.body!);
  }
}
