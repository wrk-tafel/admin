import {Component, inject, input} from '@angular/core';
import {DistributionApiService} from '../../../../api/distribution-api.service';
import {HttpResponse} from '@angular/common/http';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {parseContentDispositionFilename} from '../../../../common/util/content-disposition.util';
import {MatCard, MatCardContent, MatCardFooter} from '@angular/material/card';
import {MatButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {TafelIfDistributionActiveDirective} from '../../../../common/directive/tafel-if-distribution-active.directive';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import downloadIcon from '@material-symbols/svg-400/outlined/download-fill.svg';

@Component({
  selector: 'tafel-registered-customers',
  templateUrl: 'registered-customers.component.html',
  imports: [
    MatCard,
    MatCardFooter,
    MatIcon,
    MatButton,
    TafelIfDistributionActiveDirective,
    MatCardContent
  ]
})
export class RegisteredCustomersComponent {
  private readonly registerIcons = registerSvgIcons({download: downloadIcon});

  private readonly distributionApiService = inject(DistributionApiService);
  private readonly fileHelperService = inject(FileHelperService);

  count = input<number>();

  downloadCustomerList() {
    this.distributionApiService.downloadCustomerList().subscribe(response => this.processPdfResponse(response));
  }

  private processPdfResponse(response: HttpResponse<Blob>) {
    const filename = parseContentDispositionFilename(response.headers.get('content-disposition')!);
    this.fileHelperService.downloadFile(filename, response.body!);
  }
}
