import {Component, ViewChild} from '@angular/core';
import {ModalDirective} from "ngx-bootstrap/modal";

@Component({
  selector: 'tafel-passwordchange-modal',
  templateUrl: './passwordchange-modal.component.html'
})
export class PasswordChangeModalComponent {
  @ViewChild('pwdChangeModal') public modal: ModalDirective;

  constructor() {
  }

  public showDialog() {
    this.modal.show();
  }

}
