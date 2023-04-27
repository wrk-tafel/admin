import {Component} from '@angular/core';
import {TafelToastComponent} from '../tafel-toast-component';

@Component({
  selector: 'tafel-toast-warn',
  templateUrl: 'tafel-toast-warn.component.html'
})
export class TafelToastWarnComponent implements TafelToastComponent {
  title: string;
  message: string;
}
