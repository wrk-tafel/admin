import {Component} from '@angular/core';
import {ColComponent, ContainerComponent, RowComponent} from '@coreui/angular';

@Component({
  templateUrl: '404.component.html',
  imports: [
    ContainerComponent,
    RowComponent,
    ColComponent
  ],
  standalone: true
})
export class P404Component {
}
