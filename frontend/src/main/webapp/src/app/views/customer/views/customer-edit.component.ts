import {Component, OnInit, Output, ViewChild} from '@angular/core';
import {CustomerFormComponent} from '../components/customer-form.component';
import {CustomerApiService, CustomerData, ValidateCustomerResponse} from '../api/customer-api.service';
import {ModalDirective} from 'ngx-bootstrap/modal';
import {tap} from 'rxjs/operators';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'tafel-customer-edit',
  templateUrl: 'customer-edit.component.html'
})
export class CustomerEditComponent implements OnInit {
  constructor(
    private customerApiService: CustomerApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {
  }

  customerInput: CustomerData;
  customerUpdated: CustomerData;

  @Output() editMode: boolean = false;
  // TODO fix state update
  @Output() saveDisabled: boolean = true;
  @Output() errorMessage: string;

  @ViewChild(CustomerFormComponent) customerFormComponent: CustomerFormComponent;
  @ViewChild('validationResultModal') validationResultModal: ModalDirective;

  validationResult: ValidateCustomerResponse;

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const customerId = +params['id'];
      if (customerId) {
        this.customerApiService.getCustomer(customerId).subscribe((customerData) => {
          // Editing doesn't need a validation check
          this.saveDisabled = false;
          this.editMode = true;

          // Load data into forms
          this.customerInput = customerData;

          // Mark forms as touched to show the validation state (postponed to next makrotask after angular finished)
          setTimeout(() => {
            this.customerFormComponent.markAllAsTouched();
          });
        });
      }
    });
  }

  customerDataUpdated(event: CustomerData) {
    this.customerUpdated = event;
    this.changeSaveDisabledState(true);
  }

  validate() {
    this.changeSaveDisabledState(true);

    if (!this.formIsValid()) {
      this.errorMessage = 'Bitte Eingaben überprüfen!';
    } else {
      this.errorMessage = null;

      this.customerApiService.validate(this.customerUpdated).subscribe((result) => {
        this.validationResult = result;

        this.saveDisabled = !result.valid;
        this.validationResultModal.show();
      });
    }
  }

  save() {
    if (!this.formIsValid()) {
      this.errorMessage = 'Bitte Eingaben überprüfen!';
    } else {
      this.errorMessage = null;

      if (!this.editMode) {
        this.customerApiService.createCustomer(this.customerUpdated)
          .pipe(
            tap(customer => {
              this.router.navigate(['/kunden/detail', customer.id]);
            })
          ).subscribe();
      } else {
        this.customerApiService.updateCustomer(this.customerUpdated)
          .pipe(
            tap(customer => {
              this.router.navigate(['/kunden/detail', customer.id]);
            })
          ).subscribe();
      }
    }
  }

  private changeSaveDisabledState(value: boolean) {
    if (!this.editMode) {
      this.saveDisabled = value;
    }
  }

  private formIsValid() {
    this.customerFormComponent.markAllAsTouched();
    return this.customerFormComponent.isValid();
  }

}
