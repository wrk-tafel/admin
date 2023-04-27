import {Component} from '@angular/core';
import {TafelToastComponent} from '../tafel-toast-component';

@Component({
  selector: 'tafel-toast-info',
  templateUrl: 'tafel-toast-info.component.html'
})
export class TafelToastInfoComponent implements TafelToastComponent {
  title: string;
  message: string;
}
