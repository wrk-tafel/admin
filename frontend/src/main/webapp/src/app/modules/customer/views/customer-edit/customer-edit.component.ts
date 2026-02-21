import {Component, computed, effect, inject, input, linkedSignal, viewChild} from '@angular/core';
import {CustomerFormComponent} from '../../components/customer-form/customer-form.component';
import {CustomerApiService, CustomerData, ValidateCustomerResponse} from '../../../../api/customer-api.service';
import {Router} from '@angular/router';
import {
  BgColorDirective,
  ButtonCloseDirective,
  ButtonDirective,
  Colors,
  ModalBodyComponent,
  ModalComponent,
  ModalFooterComponent,
  ModalHeaderComponent,
  ModalToggleDirective
} from '@coreui/angular';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {DecimalPipe, NgClass} from '@angular/common';

@Component({
  selector: 'tafel-customer-edit',
  templateUrl: 'customer-edit.component.html',
  imports: [
    CustomerFormComponent,
    NgClass,
    ModalComponent,
    ModalHeaderComponent,
    ModalToggleDirective,
    BgColorDirective,
    ModalBodyComponent,
    ModalFooterComponent,
    ButtonCloseDirective,
    ButtonDirective,
    DecimalPipe
  ]
})
export class CustomerEditComponent {
  customerData = input<CustomerData>();

  // Writable signal linked to input - resets when customerData changes, locally writable from form updates
  customerUpdated = linkedSignal<CustomerData>(() => this.customerData());
  // editMode is derived from input customerData; use computed (read-only signal)
  editMode = computed(() => !!this.customerData());
  customerValidForSave = false;
  validationResult: ValidateCustomerResponse;
  validationResultColor: Colors;
  showValidationResultModal = false;
  customerFormComponent = viewChild<CustomerFormComponent>(CustomerFormComponent);
  readonly formIsValid = computed(() => this.customerFormComponent()?.isValid() ?? false);
  readonly isSaveEnabled = computed(() => this.formIsValid() && (this.customerValidForSave || this.editMode()));

  private readonly customerApiService = inject(CustomerApiService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  constructor() {
    // Mark forms as touched when customerData is loaded (edit mode)
    effect(() => {
      const editMode = this.editMode();
      const formComponent = this.customerFormComponent();
      if (editMode) {
        formComponent.markAllAsTouched();
      }
    });
  }

  customerDataUpdated(event: CustomerData) {
    this.customerUpdated.set(event);
    this.customerValidForSave = false;
  }

  validate() {
    const formComponent = this.customerFormComponent();
    formComponent.markAllAsTouched();

    if (!this.formIsValid()) {
      this.toastService.showToast({type: ToastType.ERROR, title: 'Bitte Eingaben überprüfen!'});
    } else {
      this.customerApiService.validate(this.customerUpdated()).subscribe((result) => {
        this.validationResult = result;
        this.validationResultColor = result.valid ? 'success' : 'danger';

        this.customerValidForSave = result.valid;
        this.showValidationResultModal = true;
      });
    }
  }

  save() {
    const formComponent = this.customerFormComponent();
    formComponent.markAllAsTouched();

    if (!this.formIsValid()) {
      this.toastService.showToast({type: ToastType.ERROR, title: 'Bitte Eingaben überprüfen!'});
    } else {
      if (!this.editMode()) {
        this.customerApiService.createCustomer(this.customerUpdated())
          .subscribe(customer => {
              this.router.navigate(['/kunden/detail', customer.id]);
            }
          );
      } else {
        this.customerApiService.updateCustomer(this.customerUpdated())
          .subscribe(customer => {
              this.router.navigate(['/kunden/detail', customer.id]);
            }
          );
      }
    }
  }

}
