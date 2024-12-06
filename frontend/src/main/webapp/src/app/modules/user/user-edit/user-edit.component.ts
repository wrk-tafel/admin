import {Component, inject, Input, OnInit, ViewChild} from '@angular/core';
import {Router} from '@angular/router';
import {UserApiService, UserData, UserPermission} from '../../../api/user-api.service';
import {UserFormComponent} from '../user-form/user-form.component';
import {ButtonDirective} from '@coreui/angular';

@Component({
  selector: 'tafel-user-edit',
  templateUrl: 'user-edit.component.html',
  standalone: true,
  imports: [
    UserFormComponent,
    ButtonDirective
  ]
})
export class UserEditComponent implements OnInit {
  @Input() permissionsData: UserPermission[];
  @Input() userData: UserData;

  userUpdated: UserData;
  userValidForSave = false;
  @ViewChild(UserFormComponent) userFormComponent: UserFormComponent;
  private readonly userApiService = inject(UserApiService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    if (this.userData) {
      // Load data into forms
      this.userUpdated = this.userData;

      // Mark forms as touched to show the validation state (postponed to next macrotask after angular finished)
      setTimeout(() => {
        this.userFormComponent.markAllAsTouched();
      });
    }
  }

  userDataUpdated(event: UserData) {
    this.userUpdated = event;
    this.userValidForSave = false;
  }

  save() {
    this.userFormComponent.markAllAsTouched();

    if (!this.userData) {
      this.userApiService.createUser(this.userUpdated)
        .subscribe(user => {
            this.router.navigate(['/benutzer/detail', user.id]);
          }
        );
    } else {
      this.userApiService.updateUser(this.userUpdated)
        .subscribe(user => {
            this.router.navigate(['/benutzer/detail', user.id]);
          }
        );
    }
  }

  isSaveEnabled(): boolean {
    if (this.userFormComponent) {
      return this.userFormComponent.isValid();
    }
    return false;
  }

}
