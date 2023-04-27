import {Component, OnInit, ViewChild} from '@angular/core';
import {ToastOptions, ToastService, ToastType} from './toast.service';
import {ToasterComponent} from '@coreui/angular';
import {TafelToastComponent} from "./toast/tafel-toast.component";

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
      const type = options.type;

      const props = {
        titlePrefix: this.getPrefixForType(type),
        title: options.title,
        message: options.message,
        bgColorClass: this.getBgColorClassForType(type)
      };

      this.toaster.addToast(TafelToastComponent, props);
    });
  }

  private getPrefixForType(type: ToastType) {
    switch (type) {
      case ToastType.ERROR:
        return 'Fehler:';
      case ToastType.INFO:
        return 'Info:';
      case ToastType.SUCCESS:
        return undefined;
      case ToastType.WARN:
        return 'Achtung!';
    }
  }

  private getBgColorClassForType(type: ToastType): string {
    switch (type) {
      case ToastType.ERROR:
        return 'danger';
      case ToastType.INFO:
        return 'info';
      case ToastType.SUCCESS:
        return 'success';
      case ToastType.WARN:
        return 'warning';
    }
  }

}
