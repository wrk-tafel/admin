import {Component, inject, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {UserApiService, UserData, UserPermission} from '../../../api/user-api.service';
import {UserFormComponent} from '../user-form/user-form.component';
import {NgClass} from '@angular/common';
import {ButtonDirective} from '@coreui/angular';

@Component({
  selector: 'tafel-user-edit',
  templateUrl: 'user-edit.component.html',
  imports: [
    UserFormComponent,
    NgClass,
    ButtonDirective
  ],
  standalone: true
})
export class UserEditComponent implements OnInit {
  userInput: UserData;
  userUpdated: UserData;
  userValidForSave = false;
  permissionsData: UserPermission[];
  @ViewChild(UserFormComponent) userFormComponent: UserFormComponent;
  private userApiService = inject(UserApiService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  ngOnInit(): void {
    this.permissionsData = this.activatedRoute.snapshot.data.permissionsData;
    const editUserData = this.activatedRoute.snapshot.data.userData;

    if (editUserData) {
      // Load data into forms
      this.userInput = editUserData;
      this.userUpdated = editUserData;

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

    if (!this.userInput) {
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
