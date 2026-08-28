import {Component, computed, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {HttpErrorResponse, HttpResponse} from '@angular/common/http';
import {MatDialog} from '@angular/material/dialog';
import {RouterLink} from '@angular/router';
import {EmployeeCreateDialogComponent, EmployeeCreateDialogResult} from './dialogs/employee-create-dialog.component';
import {
  EmployeeDeleteConfirmDialogComponent,
  EmployeeDeleteConfirmDialogData
} from './dialogs/employee-delete-confirm-dialog.component';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {FormControl, ReactiveFormsModule, ValidationErrors} from '@angular/forms';
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
import {MatPaginatorModule} from '@angular/material/paginator';
import {catchError, debounceTime, distinctUntilChanged, EMPTY, map, Observable, of, switchMap, tap} from 'rxjs';
import {
  CreateEmployeeRequest,
  EmployeeApiService,
  EmployeeData,
  EmployeeListResponse,
  PersonnelNumberAvailabilityResponse
} from '../../../../api/employee-api.service';
import {PAGE_SIZE_OPTIONS} from '../../../../common/api/paged-response';
import {MatIcon} from '@angular/material/icon';
import {MatButton} from '@angular/material/button';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import addIcon from '@material-symbols/svg-400/outlined/add-fill.svg';
import checkIcon from '@material-symbols/svg-400/outlined/check-fill.svg';
import closeIcon from '@material-symbols/svg-400/outlined/close-fill.svg';
import deleteIcon from '@material-symbols/svg-400/outlined/delete-fill.svg';
import downloadIcon from '@material-symbols/svg-400/outlined/download-fill.svg';
import editIcon from '@material-symbols/svg-400/outlined/edit-fill.svg';
import {AuthenticationService} from '../../../../common/security/authentication.service';
import {MatChipsModule} from '@angular/material/chips';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatTooltipModule} from '@angular/material/tooltip';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {parseContentDispositionFilename} from '../../../../common/util/content-disposition.util';

/** Long enough not to search on every keystroke of a name, short enough to feel immediate. */
const SEARCH_DEBOUNCE_MS = 400;

/** What an empty field and an unanswerable check both count as: nothing to warn about. */
const AVAILABLE: PersonnelNumberAvailabilityResponse = {available: true};

/**
 * Employee master data - the records the user accounts and the driver/co-driver assignment in the
 * food-collection recording are based on.
 *
 * The list searches as it is typed: the backend already searches server-side, and a name lookup is
 * refined by typing rather than by pressing a button after every correction. A personnel number is
 * checked the same way while it is entered, so the collision with an existing employee shows up
 * next to the field - and offers that employee - instead of as a failed save.
 */
@Component({
  selector: 'tafel-settings-employees',
  templateUrl: 'settings-employees.component.html',
  imports: [
    MatCard,
    MatCardActions,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCell,
    MatCellDef,
    MatChipsModule,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow,
    MatRowDef,
    MatTable,
    MatHeaderCellDef,
    MatPaginatorModule,
    MatIcon,
    MatButton,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    RouterLink
  ]
})
export class SettingsEmployeesComponent {
  private readonly registerIcons = registerSvgIcons({
    add: addIcon,
    check: checkIcon,
    close: closeIcon,
    delete: deleteIcon,
    download: downloadIcon,
    edit: editIcon
  });

  private readonly employeeApiService = inject(EmployeeApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);
  private readonly authenticationService = inject(AuthenticationService);
  private readonly fileHelperService = inject(FileHelperService);

  private _employees = signal<EmployeeListResponse | null>(null);
  protected employees = this._employees;
  displayedColumns = ['personnelNumber', 'firstname', 'lastname', 'userAccount', 'actions'];

  /**
   * What the role="status" region in the template says. With no "Suchen" button to press, this is
   * the only thing that reports the outcome of a refinement to a screen reader - the list below it
   * being replaced is not a change it notices on its own.
   */
  protected readonly searchAnnouncement = signal('');

  /** A linked account is only worth linking to for someone allowed to open it. */
  protected readonly canViewUsers = computed(() => this.authenticationService.hasPermission('USER_MANAGEMENT'));

  protected searchControl = new FormControl<string>('', {nonNullable: true});

  protected editingId = signal<number | null>(null);

  /** The employee already holding the personnel number typed into the edited row, if any. */
  protected readonly editDuplicate = signal<EmployeeData | null>(null);

  private readonly duplicateValidator = (): ValidationErrors | null => this.editDuplicate() ? {duplicateEmployee: true} : null;

  protected personnelNumberControl = new FormControl<string>('', {nonNullable: true, validators: [this.duplicateValidator]});
  protected firstnameControl = new FormControl<string>('', {nonNullable: true});
  protected lastnameControl = new FormControl<string>('', {nonNullable: true});
  private personnelNumberInput = viewChild<ElementRef<HTMLInputElement>>('personnelNumberInput');
  private personnelNumberInputMobile = viewChild<ElementRef<HTMLInputElement>>('personnelNumberInputMobile');

  constructor() {
    this.loadEmployees();

    this.searchControl.valueChanges
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), map(value => value.trim()), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.loadEmployees(1, this.employees()?.pageSize));

    // No distinctUntilChanged here, unlike the search above: the same number typed into a
    // different row is a different question, and the answer to it may well be the opposite one.
    this.personnelNumberControl.valueChanges
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map(value => value.trim()),
        switchMap(personnelNumber => personnelNumber && this.editingId()
          // A failed check must not block a save the backend would accept - it stays the authority
          // on the collision, and answers with one when the number really is taken.
          ? this.employeeApiService.checkPersonnelNumberAvailability(personnelNumber, this.editingId()!)
            .pipe(catchError(() => of(AVAILABLE)))
          : of(AVAILABLE)),
        takeUntilDestroyed()
      )
      .subscribe(response => {
        this.editDuplicate.set(response.available ? null : response.existingEmployee ?? null);
        if (this.editDuplicate()) {
          // Material only renders an error once the field counts as touched, and the collision is
          // worth showing while the number is still being typed.
          this.personnelNumberControl.markAsTouched();
        }
        this.personnelNumberControl.updateValueAndValidity({emitEvent: false});
      });

    effect(() => {
      this.personnelNumberInput()?.nativeElement.focus();
      this.personnelNumberInputMobile()?.nativeElement.focus();
    });
  }

  protected loadEmployees(page?: number, pageSize?: number) {
    this.fetchEmployees(page, pageSize).subscribe();
  }

  private fetchEmployees(page?: number, pageSize?: number): Observable<EmployeeListResponse> {
    return this.employeeApiService.findEmployees(this.searchControl.value.trim() || undefined, page, pageSize).pipe(
      tap({
        next: data => {
          this._employees.set(data);
          // No singular/plural split, unlike the change log's "Eintrag"/"Einträge": "Mitarbeiter"
          // reads the same either way.
          this.searchAnnouncement.set(`${data.totalCount} Mitarbeiter gefunden`);
        },
        error: () => this.toastr.error('Fehler beim Laden der Mitarbeiter', 'Fehler')
      }),
      catchError(() => EMPTY)
    );
  }

  protected startEdit(employee: EmployeeData) {
    this.editingId.set(employee.id);
    this.editDuplicate.set(null);
    this.personnelNumberControl.setValue(employee.personnelNumber, {emitEvent: false});
    this.firstnameControl.setValue(employee.firstname);
    this.lastnameControl.setValue(employee.lastname);
  }

  protected cancelEdit() {
    this.editingId.set(null);
    this.editDuplicate.set(null);
    this.personnelNumberControl.updateValueAndValidity({emitEvent: false});
  }

  protected saveEdit(employee: EmployeeData) {
    if (this.editDuplicate()) {
      return;
    }

    const updated: CreateEmployeeRequest = {
      personnelNumber: this.personnelNumberControl.value,
      firstname: this.firstnameControl.value,
      lastname: this.lastnameControl.value
    };

    this.employeeApiService.updateEmployee(employee.id, updated).subscribe({
      next: () => {
        this.toastr.success('Mitarbeiter gespeichert', 'Erfolgreich');
        this.cancelEdit();
        this.loadEmployees(this.employees()?.currentPage, this.employees()?.pageSize);
      },
      error: () => this.toastr.error('Speichern fehlgeschlagen', 'Fehler')
    });
  }

  protected addEmployee() {
    const dialogRef = this.dialog.open(EmployeeCreateDialogComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((result: EmployeeCreateDialogResult | undefined) => {
      if (result?.type === 'create') {
        this.createEmployee(result.employee);
      } else if (result?.type === 'openExisting') {
        this.openEmployee(result.employee);
      }
    });
  }

  private createEmployee(employee: CreateEmployeeRequest) {
    this.employeeApiService.saveEmployee(employee).subscribe({
      next: () => {
        this.toastr.success('Mitarbeiter erstellt', 'Erfolgreich');
        this.loadEmployees(this.employees()?.currentPage, this.employees()?.pageSize);
      },
      error: () => this.toastr.error('Erstellen fehlgeschlagen', 'Fehler')
    });
  }

  /**
   * An employee is hard-deleted rather than just disabled, so this asks first - deletion always
   * succeeds even once the employee is referenced elsewhere (household issuer, note author, food
   * collection driver/co-driver), those references are simply cleared. The backend still rejects it
   * with a 409 if a user account is linked to the employee, which the confirm dialog can't know in
   * advance.
   */
  protected deleteEmployee(employee: EmployeeData) {
    const data: EmployeeDeleteConfirmDialogData = {employeeName: `${employee.firstname} ${employee.lastname}`};
    this.dialog.open(EmployeeDeleteConfirmDialogComponent, {data})
      .afterClosed().subscribe(confirmed => {
        if (!confirmed) {
          return;
        }

        this.employeeApiService.deleteEmployee(employee.id).subscribe({
          next: () => {
            this.toastr.success(`Mitarbeiter ${employee.firstname} ${employee.lastname} gelöscht`, 'Erfolgreich');
            this.loadEmployees(this.employees()?.currentPage, this.employees()?.pageSize);
          },
          error: (error: HttpErrorResponse) => this.toastr.error(extractErrorMessage(error), 'Löschen fehlgeschlagen')
        });
      });
  }

  /**
   * The GDPR Art. 15/20 data takeout (issue #3394) for this employee, as a ZIP (PDF plus a
   * machine-readable JSON file) - the only export path for someone with no linked user account,
   * since they have no `users` row for `UserApiService`'s export endpoints to key off.
   */
  protected exportEmployee(employee: EmployeeData) {
    this.employeeApiService.exportEmployee(employee.id).subscribe({
      next: (response) => this.processFileResponse(response),
      error: () => this.toastr.error('Datenexport fehlgeschlagen!')
    });
  }

  private processFileResponse(response: HttpResponse<Blob>) {
    const filename = parseContentDispositionFilename(response.headers.get('content-disposition')!);
    this.fileHelperService.downloadFile(filename, response.body!);
  }

  /**
   * Answers a personnel-number collision: narrows the list to the employee already holding the
   * number and opens that row for editing, wherever in the list it was.
   */
  protected openEmployee(employee: EmployeeData) {
    this.cancelEdit();
    this.searchControl.setValue(employee.personnelNumber, {emitEvent: false});

    this.fetchEmployees(1, this.employees()?.pageSize).subscribe(data => {
      const match = data.items.find(item => item.id === employee.id);
      if (match) {
        this.startEdit(match);
      }
    });
  }

  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
}
