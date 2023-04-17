import {Component, Input} from '@angular/core';

@Component({
  selector: 'tafel-registered-customers',
  templateUrl: 'registered-customers.component.html'
})
export class RegisteredCustomersComponent {

  @Input() count?: number;

}
