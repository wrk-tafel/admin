import {Component, OnInit} from '@angular/core';
import {UserApiService, UserData} from '../../../api/user-api.service';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'tafel-user-detail',
  templateUrl: 'user-detail.component.html'
})
export class UserDetailComponent implements OnInit {
  userData: UserData;

  constructor(
    private activatedRoute: ActivatedRoute,
    private userApiService: UserApiService
  ) {
  }

  ngOnInit(): void {
    this.userData = this.activatedRoute.snapshot.data.userData;
  }

  disableUser() {
    const updatedUser = {
      ...this.userData,
      enabled: false
    };
    this.userApiService.updateUser(updatedUser);
  }

}
