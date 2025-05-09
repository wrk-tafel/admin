import {Component, inject, input} from '@angular/core';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {HttpResponse} from '@angular/common/http';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  ColComponent,
  RowComponent
} from '@coreui/angular';
import {faDownload} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TafelIfDistributionActiveDirective} from '../../../../common/directive/tafel-if-distribution-active.directive';

@Component({
  selector: 'tafel-registered-customers',
  templateUrl: 'registered-customers.component.html',
  imports: [
    CardComponent,
    CardBodyComponent,
    RowComponent,
    ColComponent,
    FaIconComponent,
    ButtonDirective,
    TafelIfDistributionActiveDirective,
    CardFooterComponent
  ],
  standalone: true
})
export class RegisteredCustomersComponent {
  private readonly distributionApiService = inject(DistributionApiService);
  private readonly fileHelperService = inject(FileHelperService);

  count? = input<number>();

  downloadCustomerList() {
    this.distributionApiService.downloadCustomerList().subscribe(response => this.processPdfResponse(response));
  }

  private processPdfResponse(response: HttpResponse<Blob>) {
    const contentDisposition = response.headers.get('content-disposition');
    const filename = contentDisposition.split(';')[1].split('filename')[1].split('=')[1].trim();
    this.fileHelperService.downloadFile(filename, response.body);
  }

  protected readonly faDownload = faDownload;
}
