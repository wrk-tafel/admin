import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {AuthenticationService} from '../../../common/security/authentication.service';

@Component({
  selector: 'tafel-login',
  templateUrl: 'login.component.html'
})
export class LoginComponent implements OnInit {
  errorMessage: string;

  loginForm = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required)
  });

  constructor(
    private auth: AuthenticationService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // just for safety reasons - remove token on loginpage
    this.auth.removeToken();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const errorType: string = params['errorType'];
      if (errorType === 'abgelaufen') {
        this.errorMessage = 'Sitzung abgelaufen! Bitte erneut anmelden.';
      } else if (errorType === 'fehlgeschlagen') {
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
