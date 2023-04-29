import {Component} from '@angular/core';

@Component({
  selector: 'tafel-toast',
  templateUrl: 'tafel-toast.component.html'
})
export class TafelToastComponent {
  bgColor: string;
  titlePrefix: string;
  title: string;
  message: string;
}
