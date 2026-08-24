import {Pipe, PipeTransform} from '@angular/core';
import {CustomerIssuer} from '../../api/customer-api.service';

/**
 * A household always gets an issuer at creation (see `HouseholdConverter.mapHouseholdToEntity`), so
 * a missing one here only ever means that employee has since been deleted - employees are personal
 * data and stay deletable even once referenced as a household's issuer.
 */
@Pipe({
  name: 'formatIssuer',
  standalone: true
})
export class FormatIssuerPipe implements PipeTransform {
  transform(issuer?: CustomerIssuer | null): string {
    if (issuer) {
      return 'von ' + issuer.personnelNumber + ' ' + issuer.firstname + ' ' + issuer.lastname;
    }
    return 'von Mitarbeiter gelöscht';
  }
}
