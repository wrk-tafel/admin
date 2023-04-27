import {Component} from '@angular/core';
import {TafelToastComponent} from '../tafel-toast-component';

@Component({
  selector: 'tafel-toast-success',
  templateUrl: 'tafel-toast-success.component.html'
})
export class TafelToastSuccessComponent implements TafelToastComponent {
  title: string;
  message: string;
}
