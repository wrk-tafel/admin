import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {FormControl, FormGroup} from '@angular/forms';
import {UserApiService, UserSearchResult} from '../../../api/user-api.service';
import {ToastService, ToastType} from '../../../common/views/default-layout/toasts/toast.service';

@Component({
  selector: 'tafel-user-search',
  templateUrl: 'user-search.component.html'
})
export class UserSearchComponent {

  searchResult: UserSearchResult;
  userSearchForm = new FormGroup({
    personnelNumber: new FormControl<string>(null),
    lastname: new FormControl<string>(null),
    firstname: new FormControl<string>(null)
  });

  constructor(
    private userApiService: UserApiService,
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
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const observer = {
      next: (userData) => this.router.navigate(['/benutzer/detail', userData.id])
    };
    this.userApiService.getUserForPersonnelNumber(this.personnelNumber.value).subscribe(observer);
  }

  searchForDetails() {
    this.userApiService.searchUser(this.lastname.value, this.firstname.value)
      .subscribe((response: UserSearchResult) => {
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