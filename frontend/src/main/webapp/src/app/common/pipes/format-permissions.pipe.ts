import {Pipe, PipeTransform} from '@angular/core';
import {UserData} from '../../api/user-api.service';

@Pipe({
  name: 'formatPermissions',
  standalone: true
})
export class FormatPermissionsPipe implements PipeTransform {
  transform(userData?: UserData): string {
    if (!userData?.permissions) {
      return '';
    }
    return userData.permissions
      .map(permission => permission.title)
      .join(', ');
  }
}
