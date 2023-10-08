import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {FormControl, FormGroup} from '@angular/forms';
import {UserApiService, UserSearchResult} from '../../../api/user-api.service';
import {ToastService, ToastType} from '../../../common/views/default-layout/toasts/toast.service';
import {TafelPaginationData} from '../../../common/components/tafel-pagination/tafel-pagination.component';

@Component({
  selector: 'tafel-user-search',
  templateUrl: 'user-search.component.html'
})
export class UserSearchComponent {
  searchResult: UserSearchResult;
  userSearchForm = new FormGroup({
    personnelNumber: new FormControl<string>(null),
    username: new FormControl<string>(null),
    lastname: new FormControl<string>(null),
    firstname: new FormControl<string>(null),
    enabled: new FormControl<boolean>(true)
  });
  paginationData: TafelPaginationData;

  constructor(
    private userApiService: UserApiService,
    private router: Router,
    private toastService: ToastService
  ) {
  }

  get personnelNumber() {
    return this.userSearchForm.get('personnelNumber');
  }

  get username() {
    return this.userSearchForm.get('username');
  }

  get enabled() {
    return this.userSearchForm.get('enabled');
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

  searchForDetails(page?: number) {
    this.userApiService.searchUser(this.username.value, this.enabled.value, this.lastname.value, this.firstname.value, page)
      .subscribe((response: UserSearchResult) => {
        if (response.items.length === 0) {
          this.toastService.showToast({type: ToastType.INFO, title: 'Keine Benutzer gefunden!'});
          this.searchResult = null;
          this.paginationData = null;
        } else {
          this.searchResult = response;
          this.paginationData = {
            count: response.items.length,
            totalCount: response.totalCount,
            currentPage: response.currentPage,
            totalPages: response.totalPages,
            pageSize: response.pageSize
          };
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
