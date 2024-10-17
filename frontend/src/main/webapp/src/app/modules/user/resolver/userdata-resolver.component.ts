import {inject, Injectable} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {UserApiService, UserData} from '../../../api/user-api.service';

@Injectable({
  providedIn: 'root'
})
export class UserDataResolver {
  private readonly userApiService = inject(UserApiService);

  public resolve(route: ActivatedRouteSnapshot): Observable<UserData> {
    const userId = +route.params['id'];
    return this.userApiService.getUserForId(userId);
  }

}
