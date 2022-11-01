import {Component} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {AuthenticationService} from '../../../common/security/authentication.service';

@Component({
  selector: 'tafel-login',
  templateUrl: 'login.component.html'
})
export class LoginComponent {

  errorMessage: string;

  loginForm = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required)
  });

  constructor(
    private auth: AuthenticationService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    // just for safety reasons - remove token on loginpage
    auth.removeToken();

    this.activatedRoute.params.subscribe(params => {
      const errorType: string = params['errorType'];
      if (errorType === 'expired') {
        this.errorMessage = 'Sitzung abgelaufen! Bitte erneut anmelden.';
      } else if (errorType === 'forbidden') {
        this.errorMessage = 'Zugriff nicht erlaubt!';
      }
    });
  }

  public async login() {
    const successful = await this.auth.login(this.loginForm.get('username').value, this.loginForm.get('password').value);
    if (successful) {
      await this.router.navigate(['uebersicht']);
    } else {
      this.errorMessage = 'Anmeldung fehlgeschlagen!';
    }
  }

}
