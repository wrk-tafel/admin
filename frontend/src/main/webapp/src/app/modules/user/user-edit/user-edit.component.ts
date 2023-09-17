import {Component, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {UserApiService, UserData} from '../../../api/user-api.service';
import {UserFormComponent} from '../user-form/user-form.component';

@Component({
  selector: 'tafel-user-edit',
  templateUrl: 'user-edit.component.html'
})
export class UserEditComponent implements OnInit {
  userInput: UserData;
  userUpdated: UserData;
  userValidForSave = false;

  @ViewChild(UserFormComponent) userFormComponent: UserFormComponent;

  constructor(
    private userApiService: UserApiService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
  }

  ngOnInit(): void {
    const editUserData = this.activatedRoute.snapshot.data.userData;
    if (editUserData) {
      // Load data into forms
      this.userInput = editUserData;
      this.userUpdated = editUserData;

      // Mark forms as touched to show the validation state (postponed to next makrotask after angular finished)
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
