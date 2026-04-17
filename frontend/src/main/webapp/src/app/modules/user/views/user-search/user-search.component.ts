import {Component, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {UserApiService, UserData, UserSearchResult} from '../../../../api/user-api.service';
import {ToastrService} from 'ngx-toastr';
import {
  TafelPaginationComponent,
  TafelPaginationData
} from '../../../../common/components/tafel-pagination/tafel-pagination.component';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef, MatHeaderRow, MatHeaderRowDef, MatRow, MatRowDef,
  MatTable,
  MatTableModule
} from '@angular/material/table';
import {faPencil, faSearch, faUser} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';

import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {form, FormField} from '@angular/forms/signals';
import {MatDividerModule} from '@angular/material/divider';

@Component({
  selector: 'tafel-user-search',
  templateUrl: 'user-search.component.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TafelPaginationComponent,
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
    MatTableModule
  ]
})
// Note: Material modules are added via standalone imports below to keep the decorator concise.
export class UserSearchComponent {
  private readonly userApiService = inject(UserApiService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

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
  paginationData = signal<TafelPaginationData | undefined>(undefined);

  // columns for mat-table
  displayedColumns = ['icon','id','name','personnelNumber','enabled','actions'];

  searchForPersonnelNumber() {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const observer = {
      next: (userData: UserData) => this.navigateToUserDetail(userData.id),
      error: (error) => {
        if (error.status === 404) {
          this.toastr.error('Benutzer nicht gefunden!');
        } else {
          this.toastr.error('Fehler beim Laden des Benutzers!');
        }
      }
    };
    this.userApiService.getUserForPersonnelNumber(this.searchForm.personnelNumber().value()).subscribe(observer);
  }

  navigateToUserDetail(userId: number) {
    return this.router.navigate(['/benutzer/detail', userId]);
  }

  searchForDetails(page?: number) {
    const username = this.searchForm.username().value();
    const enabled = this.searchForm.enabled().value();
    const lastname = this.searchForm.lastname().value();
    const firstname = this.searchForm.firstname().value();

    this.userApiService.searchUser(username, enabled, lastname, firstname, page)
      .subscribe((response: UserSearchResult) => {
        if (response.items.length === 0) {
          this.toastr.info('Keine Benutzer gefunden!');
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

  protected readonly faSearch = faSearch;
  protected readonly faPencil = faPencil;
  protected readonly faUser = faUser;
}
