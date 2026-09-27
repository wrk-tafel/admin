import {Component, computed, inject, input, linkedSignal, signal} from '@angular/core';
import {HttpErrorResponse, HttpResponse} from '@angular/common/http';
import {MatDialog} from '@angular/material/dialog';
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
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {parseContentDispositionFilename} from '../../../../common/util/content-disposition.util';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../../../common/http/suppress-error-toast.token';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {UserDeleteConfirmDialogComponent} from '../../components/user-delete-confirm-dialog/user-delete-confirm-dialog.component';

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
  private readonly fileHelperService = inject(FileHelperService);
  private readonly dialog = inject(MatDialog);

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

  /** Whether two-factor authentication is on, and which methods the user has. */
  readonly mfaText = computed(() => {
    const methods = (this.currentUserData().mfaMethods ?? []).map(method => method === 'TOTP' ? 'Authenticator-App' : 'Code per E-Mail');
    return methods.length > 0 ? `Aktiv (${methods.join(', ')})` : 'Nicht aktiv';
  });

  disableUser() {
    this.changeUserState(false);
  }

  enableUser() {
    this.changeUserState(true);
  }

  /**
   * Asks first, with the same dialog as the user search's trash button - an account is deleted for
   * good. The backend's refusal (e.g. the last active administrator) is shown as it words it.
   */
  deleteUser() {
    const user = this.currentUserData();
    const name = [user.firstname, user.lastname].filter(part => !!part).join(' ');
    this.dialog.open(UserDeleteConfirmDialogComponent, {data: {username: user.username, name}})
      .afterClosed().subscribe(confirmed => {
        if (!confirmed) {
          return;
        }

        this.userApiService.deleteUser(user.id!, SUPPRESS_ERROR_TOAST_CONTEXT).subscribe({
          next: () => {
            this.toastr.success('Benutzer wurde gelöscht!');
            this.router.navigate(['/benutzer/suchen']);
          },
          error: (error: HttpErrorResponse) => {
            this.toastr.error(extractErrorMessage(error), 'Löschen fehlgeschlagen!');
          },
        });
      });
  }

  /**
   * For someone who lost the phone the codes come from: afterwards a password is enough to log in
   * again, and they can set it up anew from their own account page. Not offered for an administrator
   * unless the caller is one too - the backend refuses it otherwise.
   */
  resetMfa() {
    this.userApiService.resetMfa(this.currentUserData().id!).subscribe({
      next: () => {
        this.currentUserData.set({...this.currentUserData(), mfaEnabled: false, mfaMethods: []});
        this.toastr.success('Zwei-Faktor-Authentifizierung wurde zurückgesetzt!');
      },
      error: () => this.toastr.error('Zurücksetzen fehlgeschlagen!')
    });
  }

  editUser() {
    this.router.navigate(['/benutzer/bearbeiten', this.currentUserData().id]);
  }

  /**
   * The GDPR Art. 15/20 data takeout for this user's account (issue #3363), admin-triggered on
   * their behalf - e.g. an HR-style request, or one made after they've left. Same ZIP (PDF plus a
   * machine-readable JSON file) as the self-service export in the user menu.
   */
  exportUserData() {
    this.userApiService.exportUserById(this.currentUserData().id!).subscribe({
      next: (response) => this.processFileResponse(response),
      error: () => this.toastr.error('Datenexport fehlgeschlagen!')
    });
  }

  private processFileResponse(response: HttpResponse<Blob>) {
    const filename = parseContentDispositionFilename(response.headers.get('content-disposition')!);
    this.fileHelperService.downloadFile(filename, response.body!);
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
