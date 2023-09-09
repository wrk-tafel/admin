import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {CustomerApiService, CustomerSearchResult} from '../../../../api/customer-api.service';
import {FormControl, FormGroup} from '@angular/forms';
import {ToastService, ToastType} from '../../../../common/views/default-layout/toasts/toast.service';

@Component({
  selector: 'tafel-user-search',
  templateUrl: 'user-search.component.html'
})
export class UserSearchComponent {
  searchResult: CustomerSearchResult;
  userSearchForm = new FormGroup({
    personnelNumber: new FormControl<number>(null),
    lastname: new FormControl<string>(null),
    firstname: new FormControl<string>(null)
  });

  constructor(
    private customerApiService: CustomerApiService,
    private router: Router,
    private toastService: ToastService
  ) {
  }

  get personnelNumber() {
    return this.userSearchForm.get('personnelNumber');
  }

  get lastname() {
    return this.userSearchForm.get('lastname');
  }

  get firstname() {
    return this.userSearchForm.get('firstname');
  }

  searchForPersonnelNumber() {
    const personnelNumber = this.personnelNumber.value;

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const observer = {
      next: (response) => this.router.navigate(['/benutzer/detail', personnelNumber])
    };
    this.customerApiService.getCustomer(personnelNumber).subscribe(observer);
  }

  searchForDetails() {
    this.customerApiService.searchCustomer(this.lastname.value, this.firstname.value)
      .subscribe((response: CustomerSearchResult) => {
        if (response.items.length === 0) {
          this.toastService.showToast({type: ToastType.INFO, title: 'Keine Benutzer gefunden!'});
          this.searchResult = null;
        } else {
          this.searchResult = response;
        }
      });
  }

  navigateToUser(personnelNumber: number) {
    this.router.navigate(['/benutzer/detail', personnelNumber]);
  }

  editUser(personnelNumber: number) {
    this.router.navigate(['/benutzer/bearbeiten', personnelNumber]);
  }

}
