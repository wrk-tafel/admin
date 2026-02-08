import {Component, effect, inject} from '@angular/core';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  ColComponent,
  FormSelectDirective,
  RowComponent
} from '@coreui/angular';
import {IconDirective} from '@coreui/icons-angular';
import {cilEnvelopeClosed} from '@coreui/icons';
import {DistributionApiService, DistributionItem} from '../../../../api/distribution-api.service';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';

@Component({
    selector: 'tafel-send-mails',
    templateUrl: 'send-mails.component.html',
    imports: [
        CardComponent,
        CardHeaderComponent,
        ColComponent,
        IconDirective,
        RowComponent,
        CardBodyComponent,
        ButtonDirective,
        DatePipe,
        FormsModule,
        FormsModule,
        FormSelectDirective
    ]
})
export class SendMailsComponent {
  private readonly distributionApiService = inject(DistributionApiService);
  private readonly toastService = inject(ToastService);
  protected readonly cilEnvelopeClosed = cilEnvelopeClosed;

  public distributions: DistributionItem[];
  public selectedDistribution: DistributionItem;

  initialLoadEffect = effect(() => {
    this.distributionApiService.getDistributions().subscribe((response) => {
      const distributions = response.items;
      this.distributions = distributions;

      if (distributions.length > 0) {
        this.selectedDistribution = distributions[0];
      }
    });
  });

  sendMails() {
    const observer = {
      next: () => {
        this.toastService.showToast({type: ToastType.SUCCESS, title: 'E-Mails wurden erneut verschickt!'});
      },
      error: error => {
        this.toastService.showToast({type: ToastType.SUCCESS, title: 'Senden der E-Mails fehlgeschlagen!'});
      },
    };
    this.distributionApiService.sendMails(this.selectedDistribution.id).subscribe(observer);
  }

}
