import {Component, OnInit, ViewChild} from '@angular/core';
import {CustomerFormComponent} from '../customer-form/customer-form.component';
import {CustomerApiService, CustomerData, ValidateCustomerResponse} from '../../../../api/customer-api.service';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'tafel-customer-edit',
  templateUrl: 'customer-edit.component.html'
})
export class CustomerEditComponent implements OnInit {
  customerInput: CustomerData;
  customerUpdated: CustomerData;
  editMode: boolean = false;
  customerValidForSave: boolean = false;
  errorMessage: string;
  validationResult: ValidateCustomerResponse;
  showValidationResultModal: boolean = false;

  @ViewChild(CustomerFormComponent) customerFormComponent: CustomerFormComponent;

  constructor(
    private customerApiService: CustomerApiService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
  }

  ngOnInit(): void {
    const customerData = this.activatedRoute.snapshot.data.customerData;
    if (customerData) {
      this.editMode = true;

      // Load data into forms
      this.customerInput = customerData;
      this.customerUpdated = customerData;

      // Mark forms as touched to show the validation state (postponed to next makrotask after angular finished)
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
      this.errorMessage = 'Bitte Eingaben überprüfen!';
    } else {
      this.errorMessage = null;

      this.customerApiService.validate(this.customerUpdated).subscribe((result) => {
        this.validationResult = result;

        this.customerValidForSave = result.valid;
        this.showValidationResultModal = true;
      });
    }
  }

  save() {
    this.customerFormComponent.markAllAsTouched();

    if (!this.formIsValid()) {
      this.errorMessage = 'Bitte Eingaben überprüfen!';
    } else {
      this.errorMessage = null;

      if (!this.editMode) {
        this.customerApiService.createCustomer(this.customerUpdated)
          .subscribe(customer => this.router.navigate(['/kunden/detail', customer.id]));
      } else {
        this.customerApiService.updateCustomer(this.customerUpdated)
          .subscribe(customer => this.router.navigate(['/kunden/detail', customer.id]));
      }
    }
  }

  isSaveDisabled(): boolean {
    return !this.formIsValid() || !this.customerValidForSave;
  }

  private formIsValid() {
    if (this.customerFormComponent) {
      return this.customerFormComponent.isValid();
    }
    return true;
  }

}
