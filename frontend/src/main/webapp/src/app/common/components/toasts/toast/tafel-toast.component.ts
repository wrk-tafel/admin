import {Component, forwardRef, Input} from '@angular/core';
import {
  BgColorDirective,
  ButtonCloseDirective,
  ProgressBarComponent,
  ProgressComponent,
  TextColorDirective,
  ToastBodyComponent,
  ToastCloseDirective,
  ToastComponent,
  ToastHeaderComponent
} from '@coreui/angular';

@Component({
  selector: 'tafel-toast',
  templateUrl: 'tafel-toast.component.html',
  imports: [
    ToastComponent,
    ToastHeaderComponent,
    ToastBodyComponent,
    BgColorDirective,
    ProgressComponent,
    ProgressBarComponent,
    ButtonCloseDirective,
    TextColorDirective,
    ToastCloseDirective,
    ProgressComponent,
    ToastBodyComponent,
    ToastHeaderComponent,
    ProgressComponent,
    ToastBodyComponent,
    ToastHeaderComponent,
    ProgressComponent,
    ToastBodyComponent,
    ProgressComponent,
    ToastBodyComponent,
    ToastHeaderComponent,
    ProgressComponent,
  ],
  providers: [{ provide: ToastComponent, useExisting: forwardRef(() => TafelToastComponent) }],
  standalone: true
})
export class TafelToastComponent extends ToastComponent {
  @Input() bgColor: string;
  @Input() headerTextColor: string;
  @Input() closeButton: boolean = true;
  @Input() titlePrefix: string;
  @Input() title: string;
  @Input() message: string;
}
