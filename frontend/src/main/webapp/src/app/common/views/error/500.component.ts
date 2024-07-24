import {Component} from '@angular/core';
import {ColComponent, ContainerComponent, RowComponent} from '@coreui/angular';

@Component({
  templateUrl: '500.component.html',
  imports: [
    ContainerComponent,
    RowComponent,
    ColComponent
  ],
  standalone: true
})
export class P500Component {
}
