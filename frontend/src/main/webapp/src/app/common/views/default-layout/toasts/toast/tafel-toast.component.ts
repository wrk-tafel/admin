import {Component} from '@angular/core';
import {ToastComponent} from '@coreui/angular';

@Component({
  selector: 'tafel-toast',
  templateUrl: 'tafel-toast.component.html'
})
export class TafelToastComponent extends ToastComponent {
  bgColorClass: string;
  titlePrefix: string;
  title: string;
  message: string;
}
