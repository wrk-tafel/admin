import {Component, OnInit, ViewChild} from '@angular/core';
import {ToastOptions, ToastService, ToastType} from './toast.service';
import {ToasterComponent} from '@coreui/angular';
import {TafelToastErrorComponent} from './variants/error/tafel-toast-error.component';
import {TafelToastComponent} from './variants/tafel-toast-component';
import {TafelToastInfoComponent} from "./variants/info/tafel-toast-info.component";
import {TafelToastSuccessComponent} from "./variants/success/tafel-toast-success.component";
import {TafelToastWarnComponent} from "./variants/warn/tafel-toast-warn.component";

@Component({
  selector: 'tafel-toaster',
  templateUrl: 'tafel-toaster.component.html'
})
export class TafelToasterComponent implements OnInit {

  constructor(private toastService: ToastService) {
  }

  @ViewChild(ToasterComponent) toaster: ToasterComponent;

  ngOnInit(): void {
    this.toastService.addToastSubject.subscribe((options: ToastOptions) => {
      const type = this.getToastTypeClass(options);
      const props = {title: options.title, message: options.message};
      this.toaster.addToast(type, props);
    });
  }

  getToastTypeClass(options: ToastOptions): TafelToastComponent {
    switch (options.type) {
      case ToastType.ERROR:
        return TafelToastErrorComponent;
      case ToastType.INFO:
        return TafelToastInfoComponent;
      case ToastType.SUCCESS:
        return TafelToastSuccessComponent;
      case ToastType.WARN:
        return TafelToastWarnComponent;
    }
  }

}
