import {Component, inject, Input} from '@angular/core';
import {HeaderComponent} from '@coreui/angular';
import {AuthenticationService} from '../../../security/authentication.service';

@Component({
    selector: 'app-default-header',
    templateUrl: './default-header.component.html',
})
export class DefaultHeaderComponent extends HeaderComponent {
    private authenticationService = inject(AuthenticationService);

    @Input() sidebarId = 'sidebar';

    public logout() {
        /* eslint-disable @typescript-eslint/no-unused-vars */
        this.authenticationService.logout().subscribe(_ => {
            this.authenticationService.redirectToLogin();
        });
    }

}
