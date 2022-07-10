import { Component, OnInit, Output, ViewChild, ViewChildren } from '@angular/core';
import { AddPersonFormComponent, AddPersonFormData } from '../components/addperson-form.component';
import { CustomerFormComponent, CustomerFormData } from '../components/customer-form.component';
import { v4 as uuidv4 } from 'uuid';
import { FormGroup } from '@angular/forms';
import { CustomerData, CustomerApiService, CustomerAddPersonData, ValidateCustomerResponse } from '../api/customer-api.service';
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
    private route: ActivatedRoute
  ) { }

  customerData: CustomerFormData;
  additionalPersonsData: AddPersonFormData[] = [];

  @Output() saveDisabled: boolean = true;
  @Output() errorMessage: string;

  @ViewChild(CustomerFormComponent) customerFormComponent: CustomerFormComponent;
  @ViewChildren(AddPersonFormComponent) addPersonForms: AddPersonFormComponent[];
  @ViewChild('validationResultModal') validationResultModal: ModalDirective;

  validationResult: ValidateCustomerResponse;

  ngOnInit(): void {
    if (this.route) {
      this.route.params.subscribe(params => {
        this.apiService.getCustomer(+params['id']).subscribe((customerData) => {
          this.customerData = this.mapCustomerDataForView(customerData);

          this.additionalPersonsData = [];
          customerData.additionalPersons.map((addPers) => {
            const addPersData = this.mapAddPersonDataForView(addPers);
            this.additionalPersonsData.push(addPersData);
          });
        });
      });
    }
  }

  addNewPerson() {
    this.saveDisabled = true;
    this.additionalPersonsData.push({ uuid: uuidv4() });
  }

  removePerson(index: number) {
    this.saveDisabled = true;
    this.additionalPersonsData.splice(index, 1);
  }

  trackBy(index: number, personData: AddPersonFormData) {
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

      const customerData = this.mapFormsToCustomerRequestData();
      this.apiService.validate(customerData).subscribe((result) => {
        this.validationResult = result;
        this.saveDisabled = !result.valid;
        this.validationResultModal.show();
      });
    }
  }

  save() {
    const customerData = this.mapFormsToCustomerRequestData();
    this.apiService.createCustomer(customerData)
      .pipe(
        tap(customer => {
          this.router.navigate(['/kunden/detail', customer.id]);
        })
      ).subscribe();
  }

  mapFormsToCustomerRequestData(): CustomerData {
    const addPersons = this.addPersonForms.map<CustomerAddPersonData>((personComponent) => {
      return {
        lastname: personComponent.lastname.value,
        firstname: personComponent.firstname.value,
        birthDate: personComponent.birthDate.value,
        income: personComponent.income.value
      };
    });

    const customer = this.customerFormComponent;
    return {
      id: customer.customerId.value,
      lastname: customer.lastname.value,
      firstname: customer.firstname.value,
      birthDate: customer.birthDate.value,
      country: customer.country.value,
      address: {
        street: customer.street.value,
        houseNumber: customer.houseNumber.value,
        stairway: customer.stairway.value,
        door: customer.door.value,
        postalCode: customer.postalCode.value,
        city: customer.city.value
      },
      telephoneNumber: customer.telephoneNumber.value,
      email: customer.email.value,
      employer: customer.employer.value,
      income: customer.income.value,
      incomeDue: customer.incomeDue.value,
      additionalPersons: addPersons
    };
  }

  private formsAreInvalid() {
    this.customerFormComponent.customerForm.markAllAsTouched();
    const customerFormValid = this.customerFormComponent.customerForm.valid;

    let addPersonFormsValid = true;
    this.addPersonForms.map<FormGroup>((cmp) => cmp.personForm)
      .forEach((form: FormGroup) => {
        form.markAllAsTouched();
        addPersonFormsValid &&= form.valid;
      });

    return !customerFormValid || !addPersonFormsValid;
  }

  private mapCustomerDataForView(customerData: CustomerData): CustomerFormData {
    return {
      customerId: customerData.id,
      lastname: customerData.lastname,
      firstname: customerData.firstname,
      birthDate: customerData.birthDate,
      country: {
        id: customerData.country.id,
        code: customerData.country.code,
        name: customerData.country.name
      },
      telephoneNumber: customerData.telephoneNumber,
      email: customerData.email,
      street: customerData.address.street,
      houseNumber: customerData.address.houseNumber,
      stairway: customerData.address.stairway,
      door: customerData.address.door,
      postalCode: customerData.address.postalCode,
      city: customerData.address.city,

      employer: customerData.employer,
      income: customerData.income,
      incomeDue: customerData.incomeDue
    };
  }

  private mapAddPersonDataForView(addPerson: CustomerAddPersonData): AddPersonFormData {
    return {
      uuid: uuidv4(),
      lastname: addPerson.lastname,
      firstname: addPerson.firstname,
      birthDate: addPerson.birthDate,
      income: addPerson.income
    };
  }

}
