import {Component, OnInit, ViewChild} from '@angular/core';
import {ToastOptions, ToastService, ToastType} from './toast.service';
import {ToasterComponent} from '@coreui/angular';
import {TafelToastComponent} from './toast/tafel-toast.component';
import {Subject} from 'rxjs';

@Component({
  selector: 'tafel-toaster',
  templateUrl: 'tafel-toaster.component.html'
})
export class TafelToasterComponent implements OnInit {

  constructor(private toastService: ToastService) {
  }

  @ViewChild(ToasterComponent) toaster: ToasterComponent;

  ngOnInit(): void {
    this.subscribeToastSubject(this.toastService.addToastSubject);
  }

  subscribeToastSubject(subject: Subject<ToastOptions>) {
    subject.subscribe((options: ToastOptions) => {
      const type = options.type;
      const typeSpecificOptions = this.getTypeSpecificOptions(type);

      const props = {
        title: options.title,
        message: options.message,
        autohide: true,
        delay: 5000,
        fade: true,
        ...typeSpecificOptions
      };

      this.toaster.addToast(TafelToastComponent, props);
    });
  }

  private getTypeSpecificOptions(type: ToastType) {
    switch (type) {
      case ToastType.ERROR:
        return {titlePrefix: 'Fehler:', bgColor: 'danger'};
      case ToastType.INFO:
        return {titlePrefix: 'Info:', bgColor: 'info'};
      case ToastType.SUCCESS:
        return {titlePrefix: undefined, bgColor: 'success'};
      case ToastType.WARN:
        return {titlePrefix: 'Achtung!', bgColor: 'warning'};
    }
  }

}
