import {inject, Injectable} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {UserApiService, UserPermission} from '../../../api/user-api.service';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PermissionsDataResolver {
  private readonly userApiService = inject(UserApiService);

  public resolve(route: ActivatedRouteSnapshot): Observable<UserPermission[]> {
    return this.userApiService.getPermissions().pipe(map(response => response.permissions));
  }

}
