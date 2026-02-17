import {afterNextRender, ChangeDetectorRef, Component, effect, inject, input, linkedSignal, viewChild} from '@angular/core';
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
  // Writable signal linked to input - true when customerData is provided (edit mode), false for new customer
  editMode = linkedSignal(() => !!this.customerData());
  customerValidForSave = false;
  validationResult: ValidateCustomerResponse;
  validationResultColor: Colors;
  showValidationResultModal = false;
  customerFormComponent = viewChild<CustomerFormComponent>(CustomerFormComponent);
  private readonly customerApiService = inject(CustomerApiService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    // Mark forms as touched when customerData changes (deferred to next render)
    effect(() => {
      const customerData = this.customerData();
      if (customerData) {
        afterNextRender(() => {
          const formComponent = this.customerFormComponent();
          if (formComponent) {
            formComponent.markAllAsTouched();
          }
        });
      }
    });
  }

  customerDataUpdated(event: CustomerData) {
    this.customerUpdated.set(event);
    this.customerValidForSave = false;
  }

  validate() {
    const formComponent = this.customerFormComponent();
    if (formComponent) {
      formComponent.markAllAsTouched();
    }

    if (!this.formIsValid()) {
      this.toastService.showToast({type: ToastType.ERROR, title: 'Bitte Eingaben überprüfen!'});
    } else {
      this.customerApiService.validate(this.customerUpdated()).subscribe((result) => {
        this.validationResult = result;
        this.validationResultColor = result.valid ? 'success' : 'danger';

        this.customerValidForSave = result.valid;
        this.showValidationResultModal = true;
        this.cdr.detectChanges();
      });
    }
  }

  save() {
    const formComponent = this.customerFormComponent();
    if (formComponent) {
      formComponent.markAllAsTouched();
    }

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

  get isSaveEnabled(): boolean {
    return this.formIsValid() && (this.customerValidForSave || this.editMode());
  }

  private formIsValid() {
    const formComponent = this.customerFormComponent();
    if (formComponent) {
      return formComponent.isValid();
    }
    return true;
  }

}
