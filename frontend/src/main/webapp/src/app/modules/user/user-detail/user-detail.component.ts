import {Component, OnInit} from '@angular/core';
import {UserData} from '../../../api/user-api.service';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'tafel-user-detail',
  templateUrl: 'user-detail.component.html'
})
export class UserDetailComponent implements OnInit {
  userData: UserData;

  constructor(
    private activatedRoute: ActivatedRoute
  ) {
  }

  ngOnInit(): void {
    this.userData = this.activatedRoute.snapshot.data.userData;
  }

}
