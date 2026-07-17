import {Injectable, InjectionToken, inject} from '@angular/core';
import * as toastr from 'toastr';

// 1. Define an Injection Token for toastr
export const TOASTR_TOKEN = new InjectionToken<any>('toastr');

@Injectable({
  providedIn: 'root',
  // 2. Provide the default value using the factory
  useFactory: () => toastr,
})
export class TafelToastrService {
  private readonly toastrInstance = inject(TOASTR_TOKEN);

  constructor() {
    // Configure default options
    this.toastrInstance.options.timeOut = 5000;
    this.toastrInstance.options.closeButton = true;
    this.toastrInstance.options.preventDuplicates = true;
    this.toastrInstance.options.tapToDismiss = true;
    this.toastrInstance.options.progressBar = true;
    this.toastrInstance.options.positionClass = 'toast-top-right';
  }

  success(message: string, title?: string) {
    this.toastrInstance.success(message, title);
  }

  error(message: string, title?: string) {
    this.toastrInstance.error(message, title);
  }

  info(message: string, title?: string) {
    this.toastrInstance.info(message, title);
  }

  warning(message: string, title?: string) {
    this.toastrInstance.warning(message, title);
  }
}
