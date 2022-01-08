import { Component } from '@angular/core';
import { AuthenticationService } from '../../common/security/authentication.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: 'login.component.html'
})
export class LoginComponent {

  constructor(
    private auth: AuthenticationService
  ) { }

  onClickSubmit(data: LoginFormData) {
    this.auth.login(data.username, data.password)
  }

}

type LoginFormData = {
  username: string,
  password: string
}
