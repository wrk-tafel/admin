import {Component} from '@angular/core';
import {
  BgColorDirective,
  ButtonCloseDirective,
  ProgressBarComponent,
  ProgressComponent,
  ToastBodyComponent,
  ToastComponent,
  ToastHeaderComponent
} from '@coreui/angular';

@Component({
  selector: 'tafel-toast',
  templateUrl: 'tafel-toast.component.html',
  imports: [
    ToastComponent,
    ToastHeaderComponent,
    BgColorDirective,
    ToastBodyComponent,
    ProgressComponent,
    ProgressBarComponent,
    ButtonCloseDirective
  ],
  standalone: true
})
export class TafelToastComponent extends ToastComponent {
  bgColor: string;
  titlePrefix: string;
  title: string;
  message: string;
}
