import {Component, inject, Input} from '@angular/core';
import {UserApiService, UserData} from '../../../api/user-api.service';
import {Router} from '@angular/router';
import {ToastService, ToastType} from '../../../common/views/default-layout/toasts/toast.service';
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
        CommonModule
    ]
})
export class UserDetailComponent {
  @Input() userData: UserData;

  private readonly userApiService = inject(UserApiService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

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
    this.userApiService.deleteUser(this.userData.id).subscribe(observer);
  }

  editUser() {
    this.router.navigate(['/benutzer/bearbeiten', this.userData.id]);
  }

  formatPermissions(): string {
    return this.userData?.permissions
      .map(permission => permission.title)
      .join(', ');
  }

  private changeUserState(enabled: boolean) {
    const modifiedUser = {
      ...this.userData,
      enabled: enabled
    };

    this.userApiService.updateUser(modifiedUser).subscribe(updatedUser => {
      this.userData = updatedUser;
    });
  }

}
