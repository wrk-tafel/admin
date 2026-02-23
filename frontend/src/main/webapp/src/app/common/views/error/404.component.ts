import {Component} from '@angular/core';
import {ColComponent, ContainerComponent, RowComponent} from '@coreui/angular';

@Component({
    selector: 'tafel-error-404',
    templateUrl: '404.component.html',
    imports: [
        ContainerComponent,
        RowComponent,
        ColComponent
    ]
})
export class P404Component {
}
