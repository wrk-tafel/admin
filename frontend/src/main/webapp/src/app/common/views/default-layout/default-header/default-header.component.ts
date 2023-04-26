import {Component, Input} from '@angular/core';
import {HeaderComponent} from '@coreui/angular';
import {AuthenticationService} from '../../../security/authentication.service';

@Component({
  selector: 'app-default-header',
  templateUrl: './default-header.component.html',
})
export class DefaultHeaderComponent extends HeaderComponent {

  constructor(private auth: AuthenticationService) {
    super();
  }

  @Input() sidebarId = 'sidebar';

  public logout() {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    this.auth.logout().subscribe(_ => {
      this.auth.redirectToLogin();
    });
  }

}
