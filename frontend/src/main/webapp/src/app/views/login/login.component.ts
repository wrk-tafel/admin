import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from '../../common/security/authentication.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: 'login.component.html'
})
export class LoginComponent {

  errorMessage: String;

  loginForm = new FormGroup({
    username: new FormControl(),
    password: new FormControl()
  });

  constructor(
    private auth: AuthenticationService,
    private router: Router
  ) {
    // just for safety - remove token on loginpage
    auth.removeToken();

    const errorType = this.router.getCurrentNavigation()?.extras?.state?.errorType;
    if (errorType === 'expired') {
      this.errorMessage = 'Sitzung abgelaufen! Bitte erneut anmelden.';
    }
  }

  public async login() {
    const successful = await this.auth.login(this.loginForm.get('username').value, this.loginForm.get('password').value);
    if (successful) {
      this.router.navigate(['uebersicht']);
    } else {
      this.errorMessage = 'Anmeldung fehlgeschlagen!';
    }
  }

}
