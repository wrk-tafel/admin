import {Component, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {UserApiService, UserData, UserSearchResult} from '../../../../api/user-api.service';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTableModule} from '@angular/material/table';
import {MatPaginatorModule} from '@angular/material/paginator';
import {faPencil, faSearch, faUser} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';

import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {form, FormField} from '@angular/forms/signals';
import {MatDividerModule} from '@angular/material/divider';
import {MatTooltipModule} from '@angular/material/tooltip';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../../../common/http/suppress-error-toast.token';
import {PAGE_SIZE_OPTIONS} from '../../../../common/api/paged-response';

@Component({
  selector: 'tafel-user-search',
  templateUrl: 'user-search.component.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FaIconComponent,
    TafelAutofocusDirective,
    FormField,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatTooltipModule
  ]
})
// Note: Material modules are added via standalone imports below to keep the decorator concise.
export class UserSearchComponent {
  private readonly userApiService = inject(UserApiService);
  private readonly router = inject(Router);
  private readonly toastr = inject(TafelToastrService);

  private searchModel = {
    personnelNumber: '',
    username: '',
    lastname: '',
    firstname: '',
    enabled: true,
  };
  searchFormModel = signal(this.searchModel);
  searchForm = form(this.searchFormModel);

  searchResult = signal<UserSearchResult | undefined>(undefined);

  // columns for mat-table
  displayedColumns = ['icon','id','name','personnelNumber','enabled','actions'];

  searchForPersonnelNumber() {

    const observer = {
      next: (userData: UserData) => this.navigateToUserDetail(userData.id),
      error: (error: any) => {
        if (error.status === 404) {
          this.toastr.error('Benutzer nicht gefunden!');
        } else {
          this.toastr.error('Fehler beim Laden des Benutzers!');
        }
      }
    };
    const personnelNumber = this.searchForm.personnelNumber().value();
    this.userApiService.getUserForPersonnelNumber(personnelNumber, SUPPRESS_ERROR_TOAST_CONTEXT).subscribe(observer);
  }

  navigateToUserDetail(userId: number | undefined) {
    return this.router.navigate(['/benutzer/detail', userId]);
  }

  searchForDetails(page?: number, pageSize?: number) {
    const username = this.searchForm.username().value();
    const enabled = this.searchForm.enabled().value();
    const lastname = this.searchForm.lastname().value();
    const firstname = this.searchForm.firstname().value();

    this.userApiService.searchUser(username, enabled, lastname, firstname, page, pageSize)
      .subscribe((response: UserSearchResult) => {
        if (response.items.length === 0) {
          this.toastr.info('Keine Benutzer gefunden!');
          this.searchResult.set(undefined);
        } else {
          this.searchResult.set(response);
        }
      });
  }

  editUser(personnelNumber: number | undefined) {
    this.router.navigate(['/benutzer/bearbeiten', personnelNumber]);
  }

  protected readonly faSearch = faSearch;
  protected readonly faPencil = faPencil;
  protected readonly faUser = faUser;
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
}
