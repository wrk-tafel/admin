import {Component, inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ToastOptions, ToastService, ToastType} from './toast.service';
import {
  ToasterComponent
} from '@coreui/angular';
import {TafelToastComponent} from './toast/tafel-toast.component';
import {Subject, Subscription} from 'rxjs';
import {NgClass} from '@angular/common';

@Component({
    selector: 'tafel-toaster',
    templateUrl: 'tafel-toaster.component.html',
    imports: [
        ToasterComponent,
        NgClass
    ]
})
export class TafelToasterComponent implements OnInit, OnDestroy {
  @ViewChild(ToasterComponent) toaster: ToasterComponent;
  private readonly toastService = inject(ToastService);
  private toastSubscription: Subscription;

  ngOnInit(): void {
    this.subscribeToastSubject(this.toastService.addToastSubject);
  }

  ngOnDestroy(): void {
    if (this.toastSubscription) {
      this.toastSubscription.unsubscribe();
    }
  }

  subscribeToastSubject(subject: Subject<ToastOptions>) {
    this.toastSubscription = subject.subscribe((options: ToastOptions) => {
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
        return {titlePrefix: 'Fehler:', bgColor: 'danger', headerTextColor: 'white'};
      case ToastType.INFO:
        return {titlePrefix: 'Info:', bgColor: 'info', headerTextColor: 'white'};
      case ToastType.SUCCESS:
        return {titlePrefix: undefined, bgColor: 'success', headerTextColor: 'white'};
      case ToastType.WARN:
        return {titlePrefix: 'Achtung!', bgColor: 'warning', headerTextColor: 'white'};
    }
  }

}
