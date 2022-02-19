import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from '../../common/security/authentication.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: 'login.component.html'
})
export class LoginComponent {

  @Input() errorMsg: String;

  constructor(
    private auth: AuthenticationService,
    private router: Router
  ) {
    // just for safety - remove token on loginpage
    auth.removeToken();

    const errorType = this.router.getCurrentNavigation()?.extras?.state?.errorType;
    if (errorType === 'expired') {
      this.errorMsg = 'Sitzung abgelaufen! Bitte erneut anmelden.';
    }
  }

  async onClickSubmit(data: LoginFormData) {
    const successful = await this.auth.login(data.username, data.password);
    if (successful) {
      this.router.navigate(['uebersicht']);
    } else {
      this.errorMsg = 'Anmeldung fehlgeschlagen!';
    }
  }

}

interface LoginFormData {
  username: string;
  password: string;
}
