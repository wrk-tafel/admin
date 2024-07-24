import {Component, inject, OnInit, ViewChild} from '@angular/core';
import {CustomerFormComponent} from '../customer-form/customer-form.component';
import {CustomerApiService, CustomerData, ValidateCustomerResponse} from '../../../../api/customer-api.service';
import {ActivatedRoute, Router} from '@angular/router';
import {
  BgColorDirective, ButtonCloseDirective, ButtonDirective,
  Colors,
  ModalBodyComponent,
  ModalComponent, ModalFooterComponent,
  ModalHeaderComponent,
  ModalToggleDirective
} from '@coreui/angular';
import {ToastService, ToastType} from '../../../../common/views/default-layout/toasts/toast.service';
import {NgClass} from '@angular/common';

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
    ButtonDirective
  ],
  standalone: true
})
export class CustomerEditComponent implements OnInit {
  customerInput: CustomerData;
  customerUpdated: CustomerData;
  editMode = false;
  customerValidForSave = false;
  validationResult: ValidateCustomerResponse;
  validationResultColor: Colors;
  showValidationResultModal = false;
  @ViewChild(CustomerFormComponent) customerFormComponent: CustomerFormComponent;
  private customerApiService = inject(CustomerApiService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private toastService = inject(ToastService);

  ngOnInit(): void {
    const customerData = this.activatedRoute.snapshot.data.customerData;
    if (customerData) {
      this.editMode = true;

      // Load data into forms
      this.customerInput = customerData;
      this.customerUpdated = customerData;

      // Mark forms as touched to show the validation state (postponed to next macrotask after angular finished)
      setTimeout(() => {
        this.customerFormComponent.markAllAsTouched();
      });
    }
  }

  customerDataUpdated(event: CustomerData) {
    this.customerUpdated = event;
    this.customerValidForSave = false;
  }

  validate() {
    this.customerFormComponent.markAllAsTouched();

    if (!this.formIsValid()) {
      this.toastService.showToast({type: ToastType.ERROR, title: 'Bitte Eingaben überprüfen!'});
    } else {
      this.customerApiService.validate(this.customerUpdated).subscribe((result) => {
        this.validationResult = result;
        this.validationResultColor = result.valid ? 'success' : 'danger';

        this.customerValidForSave = result.valid;
        this.showValidationResultModal = true;
      });
    }
  }

  save() {
    this.customerFormComponent.markAllAsTouched();

    if (!this.formIsValid()) {
      this.toastService.showToast({type: ToastType.ERROR, title: 'Bitte Eingaben überprüfen!'});
    } else {
      if (!this.editMode) {
        this.customerApiService.createCustomer(this.customerUpdated)
          .subscribe(customer => {
              this.router.navigate(['/kunden/detail', customer.id]);
            }
          );
      } else {
        this.customerApiService.updateCustomer(this.customerUpdated)
          .subscribe(customer => {
              this.router.navigate(['/kunden/detail', customer.id]);
            }
          );
      }
    }
  }

  isSaveEnabled(): boolean {
    return this.formIsValid() && (this.customerValidForSave || this.editMode);
  }

  private formIsValid() {
    if (this.customerFormComponent) {
      return this.customerFormComponent.isValid();
    }
    return true;
  }

}
