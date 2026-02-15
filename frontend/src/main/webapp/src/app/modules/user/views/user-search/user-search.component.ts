import {Component, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {FormBuilder, ReactiveFormsModule} from '@angular/forms';
import {UserApiService, UserData, UserSearchResult} from '../../../../api/user-api.service';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {
  TafelPaginationComponent,
  TafelPaginationData
} from '../../../../common/components/tafel-pagination/tafel-pagination.component';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent,
  ColComponent,
  FormCheckInputDirective,
  FormDirective,
  FormLabelDirective,
  InputGroupComponent,
  RowComponent,
  TableDirective
} from '@coreui/angular';
import {faPencil, faSearch, faUser} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';

import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';

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
    FaIconComponent,
    TafelAutofocusDirective
]
})
export class UserSearchComponent {
  private readonly userApiService = inject(UserApiService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    personnelNumber: this.fb.control<string>(null),
    username: this.fb.control<string>(null),
    lastname: this.fb.control<string>(null),
    firstname: this.fb.control<string>(null),
    enabled: this.fb.control<boolean>(true)
  });
  searchResult = signal<UserSearchResult | undefined>(undefined);
  paginationData = signal<TafelPaginationData | undefined>(undefined);

  searchForPersonnelNumber() {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const observer = {
      next: (userData: UserData) => this.navigateToUserDetail(userData.id),
      error: (error) => {
        if (error.status === 404) {
          this.toastService.showToast({type: ToastType.INFO, title: 'Benutzer nicht gefunden!'});
        } else {
          this.toastService.showToast({type: ToastType.ERROR, title: 'Fehler beim Laden des Benutzers!'});
        }
      }
    };
    this.userApiService.getUserForPersonnelNumber(this.personnelNumber.value).subscribe(observer);
  }

  navigateToUserDetail(userId: number) {
    return this.router.navigate(['/benutzer/detail', userId]);
  }

  searchForDetails(page?: number) {
    this.userApiService.searchUser(this.username.value, this.enabled.value, this.lastname.value, this.firstname.value, page)
      .subscribe((response: UserSearchResult) => {
        if (response.items.length === 0) {
          this.toastService.showToast({type: ToastType.INFO, title: 'Keine Benutzer gefunden!'});
          this.searchResult.set(undefined);
          this.paginationData.set(undefined);
        } else {
          this.searchResult.set(response);
          this.paginationData.set({
            count: response.items.length,
            totalCount: response.totalCount,
            currentPage: response.currentPage,
            totalPages: response.totalPages,
            pageSize: response.pageSize
          });
        }
      });
  }

  editUser(personnelNumber: number) {
    this.router.navigate(['/benutzer/bearbeiten', personnelNumber]);
  }

  get personnelNumber() {
    return this.form.get('personnelNumber');
  }

  get username() {
    return this.form.get('username');
  }

  get enabled() {
    return this.form.get('enabled');
  }

  get lastname() {
    return this.form.get('lastname');
  }

  get firstname() {
    return this.form.get('firstname');
  }

  trackByUserId(index: number, user: any): number {
    return user.id;
  }

  protected readonly faSearch = faSearch;
  protected readonly faPencil = faPencil;
  protected readonly faUser = faUser;
}
