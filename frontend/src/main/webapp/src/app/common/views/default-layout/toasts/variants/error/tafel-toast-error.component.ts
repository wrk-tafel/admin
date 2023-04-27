import {Component} from '@angular/core';
import {TafelToastComponent} from '../tafel-toast-component';

@Component({
  selector: 'tafel-toast-error',
  templateUrl: 'tafel-toast-error.component.html'
})
export class TafelToastErrorComponent implements TafelToastComponent {
  title: string;
  message: string;
}
