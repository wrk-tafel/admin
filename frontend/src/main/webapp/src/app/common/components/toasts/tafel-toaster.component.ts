import {Component, effect, inject, signal, ViewChild} from '@angular/core';
import {ToastOptions, ToastService, ToastType} from './toast.service';
import {ToasterComponent} from '@coreui/angular';
import {TafelToastComponent} from './toast/tafel-toast.component';

@Component({
    selector: 'tafel-toaster',
    templateUrl: 'tafel-toaster.component.html',
    imports: [
        ToasterComponent
    ]
})
export class TafelToasterComponent {
  @ViewChild(ToasterComponent) toaster: ToasterComponent;
  private readonly toastService = inject(ToastService);
  private processedToastIds = signal<Set<number>>(new Set());

  constructor() {
    effect(() => {
      const queue = this.toastService.getToastQueue()();
      const processed = this.processedToastIds();

      queue.forEach(toastOptions => {
        if (!processed.has(toastOptions.id)) {
          this.showToast(toastOptions);
          this.processedToastIds.update(ids => {
            const newSet = new Set(ids);
            newSet.add(toastOptions.id);
            return newSet;
          });
        }
      });
    });
  }

  private showToast(options: ToastOptions) {
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
