import {Component, forwardRef, Input} from '@angular/core';
import {
  BgColorDirective,
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
  standalone: true,
  imports: [
    ToastHeaderComponent,
    ToastBodyComponent,
    BgColorDirective,
    ProgressComponent,
    ToastCloseDirective,
    TextColorDirective,
  ],
  providers: [{provide: ToastComponent, useExisting: forwardRef(() => TafelToastComponent)}]
})
export class TafelToastComponent extends ToastComponent {
  @Input() bgColor: string;
  @Input() headerTextColor: string;
  @Input() closeButton: boolean = true;
  @Input() titlePrefix: string;
  @Input() title: string;
  @Input() message: string;
}
