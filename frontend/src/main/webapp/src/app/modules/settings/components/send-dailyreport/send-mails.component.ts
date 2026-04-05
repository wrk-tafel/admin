import {Component, effect, inject, signal} from '@angular/core';
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
import {ToastrService} from 'ngx-toastr';

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
  private readonly toastr = inject(ToastrService);
  protected readonly cilEnvelopeClosed = cilEnvelopeClosed;

  readonly distributions = signal<DistributionItem[]>([]);
  readonly selectedDistribution = signal<DistributionItem | null>(null);

  initialLoadEffect = effect(() => {
    this.distributionApiService.getDistributions().subscribe((response) => {
      const distributions = response.items;
      this.distributions.set(distributions);

      if (distributions.length > 0) {
        this.selectedDistribution.set(distributions[0]);
      }
    });
  });

  sendMails() {
    const observer = {
      next: () => {
        this.toastr.success('E-Mails wurden erneut verschickt!');
      },
      error: error => {
        this.toastr.error('Senden der E-Mails fehlgeschlagen!');
      },
    };
    const selectedDist = this.selectedDistribution();
    if (selectedDist) {
      this.distributionApiService.sendMails(selectedDist.id).subscribe(observer);
    }
  }

}
