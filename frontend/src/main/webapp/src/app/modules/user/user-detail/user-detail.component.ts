import {Component, OnInit} from '@angular/core';
import {UserApiService, UserData} from '../../../api/user-api.service';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'tafel-user-detail',
  templateUrl: 'user-detail.component.html'
})
export class UserDetailComponent implements OnInit {
  userData: UserData;

  constructor(
    private activatedRoute: ActivatedRoute,
    private userApiService: UserApiService,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.userData = this.activatedRoute.snapshot.data.userData;
  }

  disableUser() {
    this.changeUserState(false);
  }

  enableUser() {
    this.changeUserState(true);
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

  deleteUser() {
    this.userApiService.deleteUser(this.userData.id).subscribe(updatedUser => {
      this.router.navigate(['uebersicht']);
    });
  }

  editUser() {
    this.router.navigate(['/benutzer/bearbeiten', this.userData.id]);
  }

  formatPermissions(): string {
    return this.userData?.permissions
      .map(permission => permission.title)
      .join(', ');
  }

}
