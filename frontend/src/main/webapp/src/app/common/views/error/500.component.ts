import {Component} from '@angular/core';
import {ColComponent, ContainerComponent, RowComponent} from '@coreui/angular';

@Component({
  selector: 'tafel-p500',
  templateUrl: '500.component.html',
  imports: [
    ContainerComponent,
    RowComponent,
    ColComponent
  ]
})
export class P500Component {
}
