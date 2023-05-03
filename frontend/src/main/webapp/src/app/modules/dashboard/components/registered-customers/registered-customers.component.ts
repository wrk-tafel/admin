import {Component, Input} from '@angular/core';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {HttpResponse} from '@angular/common/http';
import {FileHelperService} from '../../../../common/util/file-helper.service';

@Component({
  selector: 'tafel-registered-customers',
  templateUrl: 'registered-customers.component.html',
  styleUrls: ['../../dashboard.component.css']
})
export class RegisteredCustomersComponent {

  @Input() count?: number;

  constructor(
    private distributionApiService: DistributionApiService,
    private fileHelperService: FileHelperService
  ) {
  }

  downloadCustomerList() {
    this.distributionApiService.downloadCustomerList().subscribe(response => this.processPdfResponse(response));
  }

  private processPdfResponse(response: HttpResponse<Blob>) {
    const contentDisposition = response.headers.get('content-disposition');
    const filename = contentDisposition.split(';')[1].split('filename')[1].split('=')[1].trim();
    this.fileHelperService.downloadFile(filename, response.body);
  }

}
