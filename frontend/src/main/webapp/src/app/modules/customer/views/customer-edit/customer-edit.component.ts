import {afterRenderEffect, Component, computed, ElementRef, inject, input, linkedSignal, signal, viewChild} from '@angular/core';
import {toObservable, toSignal} from '@angular/core/rxjs-interop';
import {HttpErrorResponse} from '@angular/common/http';
import {catchError, debounceTime, filter, map, switchMap} from 'rxjs/operators';
import {of} from 'rxjs';
import dayjs from 'dayjs';
import {CustomerFormComponent} from '../../components/customer-form/customer-form.component';
import {
  CustomerApiService,
  CustomerCreationResponse,
  CustomerData,
  CustomerUpdateResponse,
  QuickCheckPersonData,
  ValidateCustomerResponse
} from '../../../../api/customer-api.service';
import {Router, RouterLink} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {ValidationResultDialogComponent} from './dialogs/validation-result-dialog.component';
import {
  ConfirmCustomerSaveDialog
} from '../../components/confirm-customer-save-dialog/confirm-customer-save-dialog.component';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../../../common/http/suppress-error-toast.token';
import {HasUnsavedChanges} from './customer-edit-unsaved-changes.guard';
import {CurrencyPipe, DatePipe, NgClass} from '@angular/common';
import {MatTooltipModule} from '@angular/material/tooltip';

@Component({
  selector: 'tafel-customer-edit',
  templateUrl: 'customer-edit.component.html',
  imports: [
    CustomerFormComponent,
    MatButtonModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    NgClass,
    MatTooltipModule
  ]
})
export class CustomerEditComponent implements HasUnsavedChanges {
  customerData = input<CustomerData>();

  // Writable signal linked to input - resets when customerData changes, locally writable from form updates
  customerUpdated = linkedSignal<CustomerData>(() => this.customerData()!);
  // editMode is derived from input customerData; use computed (read-only signal)
  editMode = computed(() => !!this.customerData());
  customerFormComponent = viewChild.required<CustomerFormComponent>(CustomerFormComponent);
  readonly isSaveEnabled = computed(() => this.customerFormComponent().valid() && !this.customerData()?.locked);
  readonly dirty = computed(() => this.customerFormComponent().dirty());

  // Set right before navigating away after a successful save, so the unsaved-changes guard - which
  // otherwise only looks at the form's dirty state - doesn't ask the operator to confirm leaving a
  // screen they just finished saving.
  private readonly savedSuccessfully = signal(false);

  private readonly customerApiService = inject(CustomerApiService);
  private readonly router = inject(Router);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  /**
   * The state object of the navigation that opened this route, read once - `quickCheckPersons` (the
   * Anspruch-Schnellcheck's "Kunden anlegen" link) and `vorname`/`nachname` (the customer search
   * screen's empty-state CTA) both ride on it rather than on query params, so a searched customer
   * name never lands in the URL/browser history (GDPR gap G25, issue #3506).
   */
  private readonly navigationState = this.router.getCurrentNavigation?.()?.extras?.state as
    { quickCheckPersons?: QuickCheckPersonData[]; vorname?: string; nachname?: string } | undefined;

  /**
   * Persons handed over from the Anspruch-Schnellcheck screen (create mode only), captured from
   * the navigation that opened this route - see the quick-check's "Kunden anlegen" link.
   */
  private readonly quickCheckPersons = (this.navigationState?.quickCheckPersons ?? null) as QuickCheckPersonData[] | null;

  /**
   * Live eligibility preview: re-runs the same `/households/validate` call "Anspruch prüfen" uses,
   * debounced, as soon as the minimum data the endpoint needs is present - so the yes/no answer is
   * visible on screen while incomes are being entered, not only after an explicit click. Any
   * additional person still missing required fields (e.g. one just added) is left out of the
   * request rather than blocking the whole preview. Errors (e.g. an unconfigured household
   * composition) are swallowed here - "Anspruch prüfen" is still the place that surfaces those.
   */
  readonly liveEligibility = toSignal(
    toObservable(this.customerUpdated).pipe(
      debounceTime(600),
      filter(data => this.hasMinimumDataForLiveValidation(data)),
      switchMap(data => this.customerApiService.validate(this.sanitizeForLiveValidation(data), SUPPRESS_ERROR_TOAST_CONTEXT).pipe(
        catchError(() => of(null))
      ))
    ),
    {initialValue: null as ValidateCustomerResponse | null}
  );

  readonly liveEligibilityPersonCount = computed(() => {
    const data = this.customerUpdated();
    if (!data) {
      return 0;
    }
    const includedAdditionalPersons = (data.additionalPersons ?? []).filter(person => !person.excludeFromHousehold).length;
    return 1 + includedAdditionalPersons;
  });

  /**
   * Early duplicate warning (create mode only): once lastname, firstname and birthdate are filled
   * in, runs the same fuzzy customer search the search screen uses and keeps only the results whose
   * birthdate actually matches - before the operator fills in ten more fields and only finds out
   * about a likely duplicate from the 409 on save. Branches inside `switchMap` rather than using a
   * leading `filter` so that clearing the name (no longer eligible for the check) still emits an
   * empty list instead of leaving the last search's results on screen.
   */
  readonly possibleDuplicates = toSignal(
    toObservable(this.customerUpdated).pipe(
      debounceTime(600),
      switchMap(data => {
        if (this.editMode() || !this.hasNameAndBirthDateForDuplicateCheck(data)) {
          return of([] as CustomerData[]);
        }
        return this.customerApiService.searchCustomer(
          `${data!.lastname} ${data!.firstname}`,
          null, null, null, null, null, null, null, undefined, undefined, undefined, undefined,
          SUPPRESS_ERROR_TOAST_CONTEXT
        ).pipe(
          map(result => (result.items ?? []).filter(candidate =>
            candidate.id != null && candidate.birthDate && dayjs(candidate.birthDate).isSame(dayjs(data!.birthDate), 'day')
          )),
          catchError(() => of([] as CustomerData[]))
        );
      })
    ),
    {initialValue: [] as CustomerData[]}
  );

  private readonly duplicatesWarning = viewChild<ElementRef<HTMLElement>>('duplicatesWarning');

  constructor() {
    afterRenderEffect(() => {
      const editMode = this.editMode();
      const formComponent = this.customerFormComponent();
      if (editMode) {
        // Mark forms as touched when customerData is loaded (edit mode)
        formComponent.markAllAsTouched();
      } else {
        // "Kunden anlegen" reached from a search that found nothing prefills the name it was
        // searched for - see the customer search screen's empty-state CTA.
        formComponent.prefillNames(this.navigationState?.vorname ?? null, this.navigationState?.nachname ?? null);
        // Reached from the Anspruch-Schnellcheck instead: carry the already-entered birthdates,
        // incomes and family-allowance flags over so they are not typed twice.
        if (this.quickCheckPersons?.length) {
          formComponent.prefillQuickCheckPersons(this.quickCheckPersons);
        }
      }
    });

    // The banner sits above the identity fields, and by the time the third of them (birthdate) is
    // filled the operator has usually scrolled past that spot - a warning that just appears there
    // goes unseen, defeating its "before ten more fields are filled in" purpose. Nudge it into
    // view once, when duplicates are first found; `nearest` keeps the scroll minimal and the
    // focused input on screen.
    let hadDuplicates = false;
    afterRenderEffect(() => {
      const hasDuplicates = this.possibleDuplicates().length > 0;
      const banner = this.duplicatesWarning()?.nativeElement;
      if (hasDuplicates && !hadDuplicates) {
        banner?.scrollIntoView({block: 'nearest'});
      }
      hadDuplicates = hasDuplicates;
    });
  }

  hasUnsavedChanges(): boolean {
    return this.dirty() && !this.savedSuccessfully();
  }

  customerDataUpdated(event: CustomerData) {
    this.customerUpdated.set(event);
  }

  validate() {
    if (!this.validateForm()) {
      return;
    }

    this.customerApiService.validate(this.customerUpdated()).subscribe({
      next: (result) => {
        this.dialog.open(ValidationResultDialogComponent, {
          data: {validationResult: result}
        }).afterClosed().subscribe();
      },
      // the request opts into the interceptor's error toast, which is the whole presentation this
      // needs - but without an error callback the rethrown HttpErrorResponse escapes as an uncaught
      // application error, so a rejected validation (e.g. a household composition with no
      // configured income limit) would blow up instead of just not opening the dialog
      error: () => {
      }
    });
  }

  openConfirmCustomerSaveDialog(message: string, confirmationCallback = () => {
  }) {
    this.dialog.open(ConfirmCustomerSaveDialog, {
      data: {
        message: message
      }
    }).afterClosed().subscribe(confirmed => {
      if (confirmed) {
        confirmationCallback();
      }
    });
  }

  save() {
    if (!this.validateForm()) {
      return;
    }

    if (!this.editMode()) {
      const observer = {
        next: (response: CustomerCreationResponse) => {
          const customer = response.data;
          this.savedSuccessfully.set(true);
          this.router.navigate(['/kunden/detail', customer.id]);
        },
        error: (error: HttpErrorResponse) => {
          const errorMessage = extractErrorMessage(error);
          if (error.status === 409) {
            this.openConfirmCustomerSaveDialog(errorMessage, () => {
              this.customerApiService.createCustomer(this.customerUpdated(), true, SUPPRESS_ERROR_TOAST_CONTEXT).subscribe({
                next: (response: CustomerCreationResponse) => {
                  const customer = response.data;
                  this.savedSuccessfully.set(true);
                  this.toastr.success('Kunde wurde gespeichert!');
                  this.router.navigate(['/kunden/detail', customer.id]);
                },
                error: (retryError: HttpErrorResponse) => {
                  this.toastr.error(extractErrorMessage(retryError), 'Speichern fehlgeschlagen!');
                },
              });
            });
          } else {
            this.toastr.error(errorMessage, 'Speichern fehlgeschlagen!');
          }
        },
      };

      this.customerApiService.createCustomer(this.customerUpdated(), false, SUPPRESS_ERROR_TOAST_CONTEXT).subscribe(observer);
    } else {
      const observer = {
        next: (response: CustomerUpdateResponse) => {
          const customer = response.data;
          this.savedSuccessfully.set(true);
          this.router.navigate(['/kunden/detail', customer.id]);
        },
        error: (error: HttpErrorResponse) => {
          const errorMessage = extractErrorMessage(error);
          if (error.status === 409) {
            this.openConfirmCustomerSaveDialog(errorMessage, () => {
              this.customerApiService.updateCustomer(this.customerUpdated(), true, SUPPRESS_ERROR_TOAST_CONTEXT).subscribe({
                next: (response: CustomerUpdateResponse) => {
                  const customer = response.data;
                  this.savedSuccessfully.set(true);
                  this.toastr.success('Kunde wurde gespeichert!');
                  this.router.navigate(['/kunden/detail', customer.id]);
                },
                error: (retryError: HttpErrorResponse) => {
                  this.toastr.error(extractErrorMessage(retryError), 'Speichern fehlgeschlagen!');
                },
              });
            });
          } else {
            this.toastr.error(errorMessage, 'Speichern fehlgeschlagen!');
          }
        },
      };
      this.customerApiService.updateCustomer(this.customerUpdated(), false, SUPPRESS_ERROR_TOAST_CONTEXT).subscribe(observer);
    }
  }

  private validateForm(): boolean {
    const formComponent = this.customerFormComponent();
    formComponent.markAllAsTouched();

    if (!formComponent.valid()) {
      this.toastr.error('Bitte Eingaben überprüfen!');
      return false;
    }
    return true;
  }

  /** The subset of `HouseholdRequest`/`Person` fields the backend requires for `/households/validate`. */
  private hasMinimumDataForLiveValidation(data: CustomerData | undefined): boolean {
    if (!data) {
      return false;
    }
    return !!data.lastname && !!data.firstname && !!data.birthDate && !!data.gender && !!data.country
      && !!data.address?.street && !!data.address?.houseNumber && !!data.address?.postalCode && !!data.address?.city;
  }

  /** Drops additional persons that are still missing required fields (e.g. one just added and not yet filled in). */
  private sanitizeForLiveValidation(data: CustomerData): CustomerData {
    return {
      ...data,
      additionalPersons: (data.additionalPersons ?? []).filter(person =>
        !!person.firstname && !!person.lastname && !!person.birthDate && !!person.gender && !!person.country
      )
    };
  }

  private hasNameAndBirthDateForDuplicateCheck(data: CustomerData | undefined): boolean {
    return !!data?.lastname && !!data?.firstname && !!data?.birthDate;
  }
}
