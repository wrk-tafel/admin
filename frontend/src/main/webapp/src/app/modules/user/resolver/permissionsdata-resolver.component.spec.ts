import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {ActivatedRouteSnapshot} from '@angular/router';
import {PermissionsListResponse, UserApiService, UserPermission} from '../../../api/user-api.service';
import {PermissionsDataResolver} from './permissionsdata-resolver.component';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideZonelessChangeDetection} from "@angular/core";

describe('PermissionsDataResolver', () => {
  let apiService: jasmine.SpyObj<UserApiService>;
  let resolver: PermissionsDataResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: UserApiService,
          useValue: jasmine.createSpyObj('UserApiService', ['getPermissions'])
        },
        PermissionsDataResolver
      ]
    });

    apiService = TestBed.inject(UserApiService) as jasmine.SpyObj<UserApiService>;
    resolver = TestBed.inject(PermissionsDataResolver);
  });

  it('resolve', () => {
    const mockPermissionsResponse: PermissionsListResponse = {
      permissions: [
        {key: 'PERM1', title: 'Permission 1'},
        {key: 'PERM2', title: 'Permission 2'}
      ]
    };
    apiService.getPermissions.and.returnValue(of(mockPermissionsResponse));

    const activatedRoute = <ActivatedRouteSnapshot>{};
    resolver.resolve(activatedRoute).subscribe((permissions: UserPermission[]) => {
      expect(permissions).toEqual(mockPermissionsResponse.permissions);
    });

    expect(apiService.getPermissions).toHaveBeenCalled();
  });

});
