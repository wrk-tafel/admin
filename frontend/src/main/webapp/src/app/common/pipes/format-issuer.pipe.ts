import {Pipe, PipeTransform} from '@angular/core';
import {CustomerIssuer} from '../../api/customer-api.service';

@Pipe({
  name: 'formatIssuer',
  standalone: true
})
export class FormatIssuerPipe implements PipeTransform {
  transform(issuer?: CustomerIssuer): string {
    if (issuer) {
      return 'von ' + issuer.personnelNumber + ' ' + issuer.firstname + ' ' + issuer.lastname;
    }
    return '';
  }
}
