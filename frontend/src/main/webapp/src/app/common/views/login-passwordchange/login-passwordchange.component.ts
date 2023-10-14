import {Component, inject, ViewChild} from '@angular/core';
import {PasswordChangeFormComponent} from '../passwordchange-form/passwordchange-form.component';
import {Router} from '@angular/router';
import {AuthenticationService, LoginResult} from '../../security/authentication.service';

@Component({
    selector: 'tafel-login-passwordchange',
    templateUrl: 'login-passwordchange.component.html'
})
export class LoginPasswordChangeComponent {
    private authenticationService = inject(AuthenticationService);
    private router = inject(Router);

    @ViewChild(PasswordChangeFormComponent) public form: PasswordChangeFormComponent;

    changePassword() {
        this.form.changePassword().subscribe(successful => {
            if (successful) {
                const username = this.authenticationService.getUsername();
                const password = this.form.newPassword.value;
                this.authenticationService.login(username, password).then((result: LoginResult) => {
                    if (result.successful) {
                        this.router.navigate(['uebersicht']);
                    }
                });
            }
        });
    }

    cancel() {
        this.router.navigate(['login']);
    }

    isSaveDisabled(): boolean {
        return !this.form?.isValid();
    }

}
