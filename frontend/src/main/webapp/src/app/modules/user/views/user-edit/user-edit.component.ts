import {Component, effect, inject, input, linkedSignal, untracked, viewChild} from '@angular/core';
import {Router} from '@angular/router';
import {UserApiService, UserData, UserPermission} from '../../../../api/user-api.service';
import {UserFormComponent} from '../../components/user-form/user-form.component';
import {ButtonDirective} from '@coreui/angular';

@Component({
    selector: 'tafel-user-edit',
    templateUrl: 'user-edit.component.html',
    imports: [
        UserFormComponent,
        ButtonDirective
    ]
})
export class UserEditComponent {
  permissionsData = input<UserPermission[]>();
  userData = input<UserData>();

  // Writable signal linked to input - resets when userData changes, locally writable from form updates
  userUpdated = linkedSignal<UserData>(() => this.userData());
  userValidForSave = false;
  userFormComponent = viewChild<UserFormComponent>(UserFormComponent);
  private readonly userApiService = inject(UserApiService);
  private readonly router = inject(Router);

  constructor() {
    // Mark forms as touched when userData changes (deferred to next microtask)
    effect(() => {
      const userData = this.userData();
      if (userData) {
        queueMicrotask(() => {
          untracked(() => {
            const formComponent = this.userFormComponent();
            if (formComponent) {
              formComponent.markAllAsTouched();
            }
          });
        });
      }
    });
  }

  userDataUpdated(event: UserData) {
    this.userUpdated.set(event);
    this.userValidForSave = false;
  }

  save() {
    const formComponent = this.userFormComponent();
    if (formComponent) {
      formComponent.markAllAsTouched();
    }

    if (!this.userData()) {
      this.userApiService.createUser(this.userUpdated())
        .subscribe(user => {
            this.router.navigate(['/benutzer/detail', user.id]);
          }
        );
    } else {
      this.userApiService.updateUser(this.userUpdated())
        .subscribe(user => {
            this.router.navigate(['/benutzer/detail', user.id]);
          }
        );
    }
  }

  isSaveEnabled(): boolean {
    const formComponent = this.userFormComponent();
    if (formComponent) {
      return formComponent.isValid();
    }
    return false;
  }

}
