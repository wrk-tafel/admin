import {Component, computed, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {toSignal} from '@angular/core/rxjs-interop';
import {MatDialog} from '@angular/material/dialog';
import {CountryCreateDialogComponent} from './dialogs/country-create-dialog.component';
import {MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable
} from '@angular/material/table';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatIcon} from '@angular/material/icon';
import {MatButton, MatIconButton} from '@angular/material/button';
import {MatTooltipModule} from '@angular/material/tooltip';
import {CountryAdminData, CountryApiService, CountryCreateData} from '../../../../api/country-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {HttpErrorResponse} from '@angular/common/http';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import addIcon from '@material-symbols/svg-400/outlined/add-fill.svg';
import checkIcon from '@material-symbols/svg-400/outlined/check-fill.svg';
import closeIcon from '@material-symbols/svg-400/outlined/close-fill.svg';
import editIcon from '@material-symbols/svg-400/outlined/edit-fill.svg';
import publicIcon from '@material-symbols/svg-400/outlined/public-fill.svg';
import searchIcon from '@material-symbols/svg-400/outlined/search-fill.svg';
import {
  EnabledFilter,
  matchesEnabledFilter
} from '../../../../common/components/tafel-enabled-filter/enabled-filter';
import {
  TafelEnabledFilterComponent
} from '../../../../common/components/tafel-enabled-filter/tafel-enabled-filter.component';
import {
  TafelEnabledToggleComponent
} from '../../../../common/components/tafel-enabled-toggle/tafel-enabled-toggle.component';

@Component({
  selector: 'tafel-settings-countries',
  templateUrl: 'settings-countries.component.html',
  imports: [
    MatCard,
    MatCardActions,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow,
    MatRowDef,
    MatTable,
    MatHeaderCellDef,
    MatIcon,
    MatButton,
    MatIconButton,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    TafelEnabledFilterComponent,
    TafelEnabledToggleComponent
  ]
})
export class SettingsCountriesComponent {
  private readonly registerIcons = registerSvgIcons({
    add: addIcon,
    check: checkIcon,
    close: closeIcon,
    edit: editIcon,
    public: publicIcon,
    search: searchIcon
  });

  private readonly countryApiService = inject(CountryApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  private readonly _countries = signal<CountryAdminData[]>([]);
  private readonly _loaded = signal(false);
  protected readonly loaded = this._loaded;

  displayedColumns = ['active', 'code', 'name', 'actions'];

  protected readonly searchControl = new FormControl('', {nonNullable: true});
  private readonly searchText = toSignal(this.searchControl.valueChanges, {initialValue: ''});
  protected readonly enabledFilter = signal<EnabledFilter>('ALL');

  protected readonly totalCount = computed(() => this._countries().length);
  protected readonly enabledCount = computed(() => this._countries().filter(country => country.enabled).length);
  protected readonly filtered = computed(() => this.searchText().trim().length > 0 || this.enabledFilter() !== 'ALL');

  /**
   * A deactivated country is kept forever - every person's nationality points at one, across every
   * household's history - so the list only ever grows. The filter and search are what keep the
   * working list manageable over the full ISO list.
   */
  protected readonly visibleCountries = computed(() => {
    const search = this.searchText().trim().toLowerCase();
    const filter = this.enabledFilter();
    return this._countries()
      .filter(country =>
        matchesEnabledFilter(country.enabled, filter) &&
        (search.length === 0 || country.name.toLowerCase().includes(search) || country.code.toLowerCase().includes(search))
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  protected readonly resultCountLabel = computed(() => `${this.visibleCountries().length} von ${this.totalCount()} Ländern`);

  protected editingId = signal<number | null>(null);
  protected nameControl = new FormControl<string>('', {nonNullable: true});
  // Same shape the backend enforces (@Size(min=2, max=2)) - caught here so an invalid code never
  // becomes a bare "Speichern fehlgeschlagen" toast with the row already back to its read state.
  protected codeControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]
  });
  private nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  private nameInputMobile = viewChild<ElementRef<HTMLInputElement>>('nameInputMobile');

  constructor() {
    this.loadCountries();

    effect(() => {
      this.nameInput()?.nativeElement.focus();
      this.nameInputMobile()?.nativeElement.focus();
    });
  }

  private loadCountries() {
    this.countryApiService.getAllCountries().subscribe({
      next: data => {
        this._countries.set(data.items);
        this._loaded.set(true);
      },
      error: () => {
        this._loaded.set(true);
        this.toastr.error('Fehler beim Laden der Länder', 'Fehler');
      }
    });
  }

  protected onFilterChanged(filter: EnabledFilter) {
    this.enabledFilter.set(filter);
  }

  protected clearSearch() {
    this.searchControl.setValue('');
  }

  protected startEdit(country: CountryAdminData) {
    this.editingId.set(country.id);
    this.nameControl.setValue(country.name);
    this.codeControl.setValue(country.code);
  }

  protected cancelEdit() {
    this.editingId.set(null);
  }

  protected saveEdit(country: CountryAdminData) {
    if (this.codeControl.invalid) {
      this.codeControl.markAsTouched();
      return;
    }

    const updated: CountryAdminData = {
      ...country,
      code: this.codeControl.value.trim().toUpperCase(),
      name: this.nameControl.value.trim()
    };

    this.countryApiService.updateCountry(updated.id, updated).subscribe({
      next: () => {
        this.toastr.success('Land gespeichert', 'Erfolgreich');
        this.editingId.set(null);
        this.loadCountries();
      },
      error: (error: HttpErrorResponse) => this.toastr.error(extractErrorMessage(error), 'Speichern fehlgeschlagen')
    });
  }

  protected addCountry() {
    const dialogRef = this.dialog.open(CountryCreateDialogComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe((created: CountryCreateData | undefined) => {
      if (created) {
        this.countryApiService.createCountry(created).subscribe({
          next: () => {
            this.toastr.success('Land erstellt', 'Erfolgreich');
            this.loadCountries();
          },
          error: (error: HttpErrorResponse) => this.toastr.error(extractErrorMessage(error), 'Erstellen fehlgeschlagen')
        });
      }
    });
  }

  protected toggleCountryVisibility(country: CountryAdminData, enabled: boolean) {
    const updated: CountryAdminData = {
      ...country,
      enabled
    };

    this.countryApiService.updateCountry(updated.id, updated).subscribe({
      next: () => {
        this.toastr.success(`Land ${country.name} ${enabled ? 'aktiviert' : 'deaktiviert'}`, 'Erfolgreich');
        this.loadCountries();
      },
      error: () => this.toastr.error('Fehler beim Ändern', 'Fehler')
    });
  }
}
