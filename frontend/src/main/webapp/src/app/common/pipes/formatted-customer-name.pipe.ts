import {Pipe, PipeTransform} from '@angular/core';
import {CustomerData} from '../../api/customer-api.service';

@Pipe({
  name: 'formattedCustomerName',
  standalone: true
})
export class FormattedCustomerNamePipe implements PipeTransform {
  transform(customer?: CustomerData): string {
    if (!customer?.lastname && !customer?.firstname) {
      return '-';
    }
    const result = [customer?.lastname?.trim(), customer?.firstname?.trim()].filter(value => value).join(' ');
    return result.trim().length > 0 ? result : '-';
  }
}
