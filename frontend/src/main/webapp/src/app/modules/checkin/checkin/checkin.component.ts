import {Component} from '@angular/core';
import {FormControl, FormGroup} from "@angular/forms";
import {CustomerApiService} from "../../../api/customer-api.service";

@Component({
  selector: 'tafel-checkin',
  templateUrl: 'checkin.component.html'
})
export class CheckinComponent {

  constructor(private customerApiService: CustomerApiService) {
  }

  checkinForm = new FormGroup({
    customerId: new FormControl('')
  });

  searchForCustomerId() {
    const customerId = this.customerId.value;
    this.customerApiService.getCustomer(customerId)
      .subscribe(() => {
        // TODO impl - show details panel
      }, error => {
        if (error.status === 404) {
          // TODO impl
          // this.errorMessage = 'Kundennummer ' + customerId + ' nicht gefunden!';
        }
      });
  }

  get customerId() {
    return this.checkinForm.get('customerId');
  }

}
