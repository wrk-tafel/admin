import {Injectable} from '@angular/core';
import * as toastr from 'toastr';

@Injectable({
  providedIn: 'root'
})
export class TafelToastrService {

  constructor() {
    // Configure default options
    toastr.options.timeOut = 5000;
    toastr.options.closeButton = true;
    toastr.options.preventDuplicates = true;
    toastr.options.tapToDismiss = true;

    toastr.options.progressBar = true;
    toastr.options.positionClass = 'toast-top-right';
  }

  success(message: string, title?: string) {
    toastr.success(message, title);
  }

  error(message: string, title?: string) {
    toastr.error(message, title);
  }

  info(message: string, title?: string) {
    toastr.info(message, title);
  }

  warning(message: string, title?: string) {
    toastr.warning(message, title);
  }

}
