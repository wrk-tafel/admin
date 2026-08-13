import {afterRenderEffect, Component, computed, inject, input, linkedSignal, viewChild} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {CustomerFormComponent} from '../../components/customer-form/customer-form.component';
import {
  CustomerApiService,
  CustomerCreationResponse,
  CustomerData,
  CustomerUpdateResponse
} from '../../../../api/customer-api.service';
import {ActivatedRoute, Router} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {ValidationResultDialogComponent} from './dialogs/validation-result-dialog.component';
import {
  ConfirmCustomerSaveDialog
} from '../../components/confirm-customer-save-dialog/confirm-customer-save-dialog.component';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../../../common/http/suppress-error-toast.token';

@Component({
  selector: 'tafel-customer-edit',
  templateUrl: 'customer-edit.component.html',
  imports: [
    CustomerFormComponent,
    MatButtonModule
  ]
})
export class CustomerEditComponent {
  customerData = input<CustomerData>();

  // Writable signal linked to input - resets when customerData changes, locally writable from form updates
  customerUpdated = linkedSignal<CustomerData>(() => this.customerData()!);
  // editMode is derived from input customerData; use computed (read-only signal)
  editMode = computed(() => !!this.customerData());
  customerFormComponent = viewChild.required<CustomerFormComponent>(CustomerFormComponent);
  readonly isSaveEnabled = computed(() => this.customerFormComponent().valid());

  private readonly customerApiService = inject(CustomerApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

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
        const params = this.route.snapshot.queryParamMap;
        formComponent.prefillNames(params?.get('vorname') ?? null, params?.get('nachname') ?? null);
      }
    });
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
          this.router.navigate(['/kunden/detail', customer.id]);
        },
        error: (error: HttpErrorResponse) => {
          const errorMessage = extractErrorMessage(error);
          if (error.status === 409) {
            this.openConfirmCustomerSaveDialog(errorMessage, () => {
              this.customerApiService.createCustomer(this.customerUpdated(), true, SUPPRESS_ERROR_TOAST_CONTEXT).subscribe({
                next: (response: CustomerCreationResponse) => {
                  const customer = response.data;
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
          this.router.navigate(['/kunden/detail', customer.id]);
        },
        error: (error: HttpErrorResponse) => {
          const errorMessage = extractErrorMessage(error);
          if (error.status === 409) {
            this.openConfirmCustomerSaveDialog(errorMessage, () => {
              this.customerApiService.updateCustomer(this.customerUpdated(), true, SUPPRESS_ERROR_TOAST_CONTEXT).subscribe({
                next: (response: CustomerUpdateResponse) => {
                  const customer = response.data;
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

}
