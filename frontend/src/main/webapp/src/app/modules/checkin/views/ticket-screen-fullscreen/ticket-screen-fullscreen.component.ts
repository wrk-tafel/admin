import {Component, ChangeDetectionStrategy} from '@angular/core';
import {TicketScreenComponent} from '../../components/ticket-screen/ticket-screen.component';

@Component({
    selector: 'tafel-ticket-screen-fullscreen',
    templateUrl: 'ticket-screen-fullscreen.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        TicketScreenComponent
    ]
})
export class TicketScreenFullscreenComponent {
}
