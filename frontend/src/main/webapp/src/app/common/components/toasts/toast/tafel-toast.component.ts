import {Component, forwardRef, input} from '@angular/core';
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
    imports: [
        ToastHeaderComponent,
        ToastBodyComponent,
        BgColorDirective,
        ProgressComponent,
        TextColorDirective,
        ToastCloseDirective
    ],
    providers: [{ provide: ToastComponent, useExisting: forwardRef(() => TafelToastComponent) }]
})
export class TafelToastComponent extends ToastComponent {
  bgColor = input<string>();
  headerTextColor = input<string>();
  closeButton = input(true);
  titlePrefix = input<string>();
  title = input<string>();
  message = input<string>();
}
