import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  addToastSubject: Subject<ToastOptions> = new Subject<ToastOptions>();

  showToast(options: ToastOptions) {
    this.addToastSubject.next(options);
  }

}

export enum ToastType {
  ERROR, INFO, SUCCESS, WARN
}

export interface ToastOptions {
  type: ToastType;
  title: string;
  message?: string;
}
