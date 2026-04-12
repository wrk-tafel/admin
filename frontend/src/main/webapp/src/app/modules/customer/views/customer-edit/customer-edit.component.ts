import {afterRenderEffect, Component, computed, inject, input, linkedSignal, signal, viewChild} from '@angular/core';
import {CustomerFormComponent} from '../../components/customer-form/customer-form.component';
import {CustomerApiService, CustomerData} from '../../../../api/customer-api.service';
import {Router} from '@angular/router';
import {ButtonDirective} from '@coreui/angular';
import {ToastrService} from 'ngx-toastr';
import {MatDialog} from '@angular/material/dialog';
import {ValidationResultDialogComponent} from './dialogs/validation-result-dialog.component';
import {
  ConfirmCustomerSaveDialog
} from '../../components/confirm-customer-save-dialog/confirm-customer-save-dialog.component';

@Component({
  selector: 'tafel-customer-edit',
  templateUrl: 'customer-edit.component.html',
  imports: [
    CustomerFormComponent,
    ButtonDirective
  ]
})
export class CustomerEditComponent {
  customerData = input<CustomerData>();

  // Writable signal linked to input - resets when customerData changes, locally writable from form updates
  customerUpdated = linkedSignal<CustomerData>(() => this.customerData());
  // editMode is derived from input customerData; use computed (read-only signal)
  editMode = computed(() => !!this.customerData());
  customerValidForSave = signal(false);
  customerFormComponent = viewChild<CustomerFormComponent>(CustomerFormComponent);
  readonly isSaveEnabled = computed(() =>
    this.customerFormComponent() != null
    && this.customerFormComponent().valid()
    && (this.editMode() || this.customerValidForSave()));

  private readonly customerApiService = inject(CustomerApiService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly dialog = inject(MatDialog);

  constructor() {
    // Mark forms as touched when customerData is loaded (edit mode)
    afterRenderEffect(() => {
      const editMode = this.editMode();
      const formComponent = this.customerFormComponent();
      if (editMode) {
        formComponent.markAllAsTouched();
      }
    });
  }

  customerDataUpdated(event: CustomerData) {
    this.customerUpdated.set(event);
  }

  validate() {
    const formComponent = this.customerFormComponent();
    formComponent.markAllAsTouched();

    if (!this.customerFormComponent().valid()) {
      this.toastr.error('Bitte Eingaben überprüfen!');
    } else {
      this.customerApiService.validate(this.customerUpdated()).subscribe((result) => {
        this.customerValidForSave.set(result.valid);
        this.dialog.open(ValidationResultDialogComponent, {
          data: {validationResult: result}
        }).afterClosed().subscribe(() => {
          // Allow save after user acknowledged validation result
          // For invalid customers, enable save only if user explicitly acknowledged
          if (!result.valid) {
            this.customerValidForSave.set(true);
          }
        });
      });
    }
  }

  openConfirmCustomerSaveDialog(message: string, confirmationCallback = () => {}) {
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
    const formComponent = this.customerFormComponent();
    formComponent.markAllAsTouched();

    if (!this.customerFormComponent().valid()) {
      this.toastr.error('Bitte Eingaben überprüfen!');
    } else {
      if (!this.editMode()) {
        const observer = {
          next: (customer: CustomerData) => {
            this.router.navigate(['/kunden/detail', customer.id]);
          },
          error: (error: any) => {
            if (error.status == 409) {
              this.openConfirmCustomerSaveDialog(error.error.message, () => {
                this.customerApiService.createCustomer(this.customerUpdated(), true).subscribe({
                  next: (customer: CustomerData) => {
                    this.toastr.success('Kunde wurde gespeichert!');
                    this.router.navigate(['/kunden/detail', customer.id]);
                  },
                  error: () => {
                    this.toastr.error('Speichern fehlgeschlagen!');
                  },
                });
              });
            } else {
              this.toastr.error('Speichern fehlgeschlagen!');
            }
          },
        };

        this.customerApiService.createCustomer(this.customerUpdated(), false).subscribe(observer);
      } else {
        const observer = {
          next: (customer: CustomerData) => {
            this.router.navigate(['/kunden/detail', customer.id]);
          },
          error: (error: any) => {
            if (error.status == 409) {
              this.openConfirmCustomerSaveDialog(error.error.message, () => {
                this.customerApiService.updateCustomer(this.customerUpdated(), true).subscribe({
                  next: (customer: CustomerData) => {
                    this.toastr.success('Kunde wurde gespeichert!');
                    this.router.navigate(['/kunden/detail', customer.id]);
                  },
                  error: () => {
                    this.toastr.error('Speichern fehlgeschlagen!');
                  },
                });
              });
            } else {
              this.toastr.error('Speichern fehlgeschlagen!');
            }
          },
        };
        this.customerApiService.updateCustomer(this.customerUpdated(), false).subscribe(observer);
      }
    }
  }

}
