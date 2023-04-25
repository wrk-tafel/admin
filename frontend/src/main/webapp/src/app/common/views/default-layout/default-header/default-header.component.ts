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

  @Input() sidebarId: string = 'sidebar';

  public logout() {
    this.auth.logout().subscribe(_ => {
      this.auth.redirectToLogin();
    });
  }

}
