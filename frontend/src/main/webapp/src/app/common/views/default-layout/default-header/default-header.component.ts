import {Component, Input, ViewChild} from '@angular/core';

import {HeaderComponent} from '@coreui/angular';
import {AuthenticationService} from '../../../security/authentication.service';
import {PasswordChangeModalComponent} from '../../passwordchange-modal/passwordchange-modal.component';

@Component({
  selector: 'app-default-header',
  templateUrl: './default-header.component.html',
})
export class DefaultHeaderComponent extends HeaderComponent {

  constructor(private auth: AuthenticationService) {
    super();
  }

  @Input() sidebarId: string = 'sidebar';
  @ViewChild(PasswordChangeModalComponent)
  private passwordChangeModalComponent: PasswordChangeModalComponent;

  public logout() {
    this.auth.logout().subscribe(_ => {
      this.auth.redirectToLogin();
    });
  }

  public changePassword() {
    this.passwordChangeModalComponent.showDialog();
  }

}
