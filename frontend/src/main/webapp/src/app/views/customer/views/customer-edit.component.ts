import { Component, Input, OnInit, Output, ViewChild, ViewChildren } from '@angular/core';
import { AddPersonFormComponent, CustomerAddPersonFormData } from '../components/addperson-form.component';
import { CustomerFormComponent } from '../components/customer-form.component';
import { v4 as uuidv4 } from 'uuid';
import { FormGroup } from '@angular/forms';
import { CustomerData, CustomerApiService, ValidateCustomerResponse } from '../api/customer-api.service';
import { ModalDirective } from 'ngx-bootstrap/modal';
import { tap } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'customer-edit',
  templateUrl: 'customer-edit.component.html'
})
export class CustomerEditComponent implements OnInit {
  constructor(
    private apiService: CustomerApiService,
    private router: Router,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const customerId = +params['id'];
      if (customerId) {
        this.apiService.getCustomer(customerId).subscribe((customerData) => {
          this.editMode = true;

          console.log("EDIT CUSTOMER", customerData);
          // TODO impl

          // TODO correct country input mapping
          // TODO correct reading from forms (add persons)

          // const selectedCountry = this.customerFormComponent.countries.filter((country) => country.id === customerData.country.id);
          // console.log("SEL COUNTRY", selectedCountry);
          //customerData = { ...customerData, country: selectedCountry }

          // Load data into forms
          this.customerData = customerData;

          this.additionalPersonsData.splice(0);
          customerData.additionalPersons.forEach((person) => {
            this.additionalPersonsData.push(person);
          });

          // Mark forms as touched to show the validation state (postponed to next makrotask after angular finished)
          setTimeout(() => {
            this.customerFormComponent.form.markAllAsTouched();
            this.addPersonForms.forEach((personForm) => {
              personForm.form.markAllAsTouched();
            });
          });
        });
      }
    });
  }

  customerData: CustomerData;
  additionalPersonsData: CustomerAddPersonFormData[] = [];

  @Output() saveDisabled: boolean = true;
  @Output() errorMessage: string;

  @ViewChild(CustomerFormComponent) customerFormComponent: CustomerFormComponent;
  @ViewChildren(AddPersonFormComponent) addPersonForms: AddPersonFormComponent[];
  @ViewChild('validationResultModal') validationResultModal: ModalDirective;

  validationResult: ValidateCustomerResponse;
  editMode = false;

  addNewPerson() {
    this.saveDisabled = true;
    this.additionalPersonsData.push({ uuid: uuidv4(), firstname: null, lastname: null, birthDate: null });
  }

  removePerson(index: number) {
    this.saveDisabled = true;
    this.additionalPersonsData.splice(index, 1);
  }

  trackBy(index: number, personData: CustomerAddPersonFormData) {
    return personData.uuid;
  }

  updatedCustomerFormData() {
    this.saveDisabled = true;
  }

  updatedPersonsFormData() {
    this.saveDisabled = true;
  }

  validate() {
    this.saveDisabled = true;

    if (this.formsAreInvalid()) {
      this.errorMessage = 'Bitte Eingaben überprüfen!';
    } else {
      this.errorMessage = null;

      const customerData = this.readFullData();
      this.apiService.validate(customerData).subscribe((result) => {
        this.validationResult = result;
        this.saveDisabled = !result.valid;
        this.validationResultModal.show();
      });
    }
  }

  save() {
    const customerData = this.readFullData();
    this.apiService.createCustomer(customerData)
      .pipe(
        tap(customer => {
          this.router.navigate(['/kunden/detail', customer.id]);
        })
      ).subscribe();
  }

  private readFullData(): CustomerData {
    return {
      ...this.customerData,
      additionalPersons: this.additionalPersonsData
    }
  }

  private formsAreInvalid() {
    this.customerFormComponent.form.markAllAsTouched();
    const customerFormValid = this.customerFormComponent.form.valid;

    let addPersonFormsValid = true;
    this.addPersonForms.map<FormGroup>((cmp) => cmp.form)
      .forEach((form: FormGroup) => {
        form.markAllAsTouched();
        addPersonFormsValid &&= form.valid;
      });

    return !customerFormValid || !addPersonFormsValid;
  }

}
