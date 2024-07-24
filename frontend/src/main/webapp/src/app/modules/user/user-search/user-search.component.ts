import {Component, inject} from '@angular/core';
import {Router} from '@angular/router';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {UserApiService, UserSearchResult} from '../../../api/user-api.service';
import {ToastService, ToastType} from '../../../common/views/default-layout/toasts/toast.service';
import {
  TafelPaginationComponent,
  TafelPaginationData
} from '../../../common/components/tafel-pagination/tafel-pagination.component';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent,
  ColComponent, FormCheckInputDirective, FormDirective, FormLabelDirective,
  InputGroupComponent,
  RowComponent, TableDirective, TextColorDirective
} from '@coreui/angular';
import {faPencil, faSearch, faUser} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {CommonModule} from "@angular/common";

@Component({
  selector: 'tafel-user-search',
  templateUrl: 'user-search.component.html',
  imports: [
    CardComponent,
    CardBodyComponent,
    RowComponent,
    ColComponent,
    ReactiveFormsModule,
    TafelPaginationComponent,
    CardFooterComponent,
    CardHeaderComponent,
    InputGroupComponent,
    FormDirective,
    FormLabelDirective,
    FormCheckInputDirective,
    TableDirective,
    ButtonDirective,
    TextColorDirective,
    FaIconComponent,
    CommonModule
  ],
  standalone: true
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
  private userApiService = inject(UserApiService);
  private router = inject(Router);
  private toastService = inject(ToastService);

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

  protected readonly faSearch = faSearch;
  protected readonly faPencil = faPencil;
  protected readonly faUser = faUser;
}
