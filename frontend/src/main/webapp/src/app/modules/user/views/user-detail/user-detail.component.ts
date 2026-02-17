import {Component, inject, input, linkedSignal} from '@angular/core';
import {UserApiService, UserData} from '../../../../api/user-api.service';
import {Router} from '@angular/router';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  ColComponent,
  DropdownComponent,
  DropdownDividerDirective,
  DropdownItemDirective,
  DropdownMenuDirective,
  DropdownToggleDirective,
  RowComponent
} from '@coreui/angular';
import {CommonModule, NgClass} from '@angular/common';
import {FormatPermissionsPipe} from '../../../../common/pipes/format-permissions.pipe';

@Component({
    selector: 'tafel-user-detail',
    templateUrl: 'user-detail.component.html',
    imports: [
        DropdownComponent,
        CardComponent,
        CardBodyComponent,
        RowComponent,
        ColComponent,
        NgClass,
        DropdownItemDirective,
        ButtonDirective,
        DropdownToggleDirective,
        DropdownMenuDirective,
        DropdownDividerDirective,
        CommonModule,
        FormatPermissionsPipe
    ]
})
export class UserDetailComponent {
  readonly userData = input<UserData>();

  private readonly userApiService = inject(UserApiService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  // Writable signal that resets from input, but can be locally updated after API calls
  readonly currentUserData = linkedSignal(() => this.userData());

  disableUser() {
    this.changeUserState(false);
  }

  enableUser() {
    this.changeUserState(true);
  }

  deleteUser() {
    const observer = {
      next: (_: any) => {
        this.toastService.showToast({type: ToastType.SUCCESS, title: 'Benutzer wurde gelöscht!'});
        this.router.navigate(['/benutzer/suchen']);
      },
      error: (_: any) => {
        this.toastService.showToast({type: ToastType.ERROR, title: 'Löschen fehlgeschlagen!'});
      },
    };
    this.userApiService.deleteUser(this.currentUserData().id).subscribe(observer);
  }

  editUser() {
    this.router.navigate(['/benutzer/bearbeiten', this.currentUserData().id]);
  }

  private changeUserState(enabled: boolean) {
    const modifiedUser = {
      ...this.currentUserData(),
      enabled: enabled
    };

    this.userApiService.updateUser(modifiedUser).subscribe(updatedUser => {
      this.currentUserData.set(updatedUser);
    });
  }

}
