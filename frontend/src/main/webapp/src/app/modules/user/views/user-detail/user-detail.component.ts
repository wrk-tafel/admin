import {Component, computed, inject, input, linkedSignal, signal} from '@angular/core';
import {UserApiService, UserData, UserPermission} from '../../../../api/user-api.service';
import {Router} from '@angular/router';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatMenuModule} from '@angular/material/menu';
import {MatDividerModule} from '@angular/material/divider';
import {MatChipsModule} from '@angular/material/chips';
import {MatTooltipModule} from '@angular/material/tooltip';
import {CommonModule, NgClass} from '@angular/common';
import {
  buildPermissionOverviewGroups,
  groupPermissionsByCategory,
  PermissionOverviewGroup
} from '../../../../common/util/permission-grouping.util';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

@Component({
    selector: 'tafel-user-detail',
    templateUrl: 'user-detail.component.html',
    imports: [
        MatCardModule,
        MatButtonModule,
        MatMenuModule,
        MatDividerModule,
        MatChipsModule,
        MatTooltipModule,
        NgClass,
        CommonModule
    ]
})
export class UserDetailComponent {
  readonly userData = input.required<UserData>();
  readonly permissionsData = input.required<UserPermission[]>();

  private readonly userApiService = inject(UserApiService);
  private readonly router = inject(Router);
  private readonly toastr = inject(TafelToastrService);

  // Writable signal that resets from input, but can be locally updated after API calls
  readonly currentUserData = linkedSignal(() => this.userData());

  readonly showAllPermissions = signal(false);

  /**
   * Collapsed (default): only the categories/permissions this user actually holds - equivalent to
   * `groupPermissionsByCategory` wrapped in the same {permission, granted} shape the template uses
   * for both modes.
   * Expanded ("Alle anzeigen"): every catalog permission within a category the user holds
   * something in, with the ones they don't hold shown muted - see `buildPermissionOverviewGroups`.
   */
  readonly permissionGroups = computed((): PermissionOverviewGroup<UserPermission>[] => {
    if (this.showAllPermissions()) {
      return buildPermissionOverviewGroups(this.permissionsData(), this.currentUserData().permissions);
    }
    return groupPermissionsByCategory(this.currentUserData().permissions)
      .map(group => ({
        category: group.category,
        permissions: group.permissions.map(permission => ({permission, granted: true})),
      }));
  });

  disableUser() {
    this.changeUserState(false);
  }

  enableUser() {
    this.changeUserState(true);
  }

  deleteUser() {
    const observer = {
      next: (_: any) => {
        this.toastr.success('Benutzer wurde gelöscht!');
        this.router.navigate(['/benutzer/suchen']);
      },
      error: (_: any) => {
        this.toastr.error('Löschen fehlgeschlagen!');
      },
    };
    this.userApiService.deleteUser(this.currentUserData().id!).subscribe(observer);
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
