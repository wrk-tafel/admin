import {afterRenderEffect, Component, inject, input, linkedSignal, viewChild} from '@angular/core';
import {HttpContext, HttpErrorResponse} from '@angular/common/http';
import {Router} from '@angular/router';
import {UserApiService, UserData, UserPermission} from '../../../../api/user-api.service';
import {UserFormComponent} from '../../components/user-form/user-form.component';
import {MatButtonModule} from '@angular/material/button';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {SUPPRESS_ERROR_TOAST} from '../../../../common/http/suppress-error-toast.token';

@Component({
  selector: 'tafel-user-edit',
  templateUrl: 'user-edit.component.html',
  imports: [
    UserFormComponent,
    MatButtonModule
  ]
})
export class UserEditComponent {
  permissionsData = input<UserPermission[]>();
  userData = input<UserData>();

  // Writable signal linked to input - resets when userData changes, locally writable from form updates
  userUpdated = linkedSignal<UserData | undefined>(() => this.userData());
  userFormComponent = viewChild<UserFormComponent>(UserFormComponent);
  private readonly userApiService = inject(UserApiService);
  private readonly router = inject(Router);
  private readonly toastr = inject(TafelToastrService);

  constructor() {
    // Mark forms as touched when userData changes (deferred to next microtask)
    afterRenderEffect(() => {
      const userData = this.userData();
      if (userData) {
        const formComponent = this.userFormComponent();
        if (formComponent) {
          formComponent.markAllAsTouched();
        }
      }
    });
  }

  userDataUpdated(event: UserData) {
    this.userUpdated.set(event);
  }

  save() {
    const formComponent = this.userFormComponent();
    if (formComponent) {
      formComponent.markAllAsTouched();
    }

    const observer = {
      next: (user: UserData) => {
        this.router.navigate(['/benutzer/detail', user.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(extractErrorMessage(error));
      },
    };

    const context = new HttpContext().set(SUPPRESS_ERROR_TOAST, true);
    if (!this.userData()) {
      this.userApiService.createUser(this.userUpdated()!, context).subscribe(observer);
    } else {
      this.userApiService.updateUser(this.userUpdated()!, context).subscribe(observer);
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
