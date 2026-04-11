import {Component, effect, inject, signal} from '@angular/core';
import {MatCard, MatCardContent, MatCardFooter, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatButton, MatButtonModule} from '@angular/material/button';
import {MatSelect, MatSelectModule} from '@angular/material/select';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {DistributionApiService, DistributionItem} from '../../../../api/distribution-api.service';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ToastrService} from 'ngx-toastr';
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faEnvelope} from "@fortawesome/free-solid-svg-icons";

@Component({
  selector: 'tafel-send-mails',
  templateUrl: 'send-mails.component.html',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatButtonModule,
    MatSelect,
    MatSelectModule,
    MatIconModule,
    MatInputModule,
    MatDatepickerModule,
    FormsModule,
    DatePipe,
    FaIconComponent,
    MatCardFooter
  ]
})
export class SendMailsComponent {
  private readonly distributionApiService = inject(DistributionApiService);
  private readonly toastr = inject(ToastrService);

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

  protected readonly faEnvelope = faEnvelope;
}
