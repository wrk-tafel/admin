import { TestBed } from '@angular/core/testing';

import { AuthorizationHeaderInterceptor } from './auth-header-interceptor.service';

describe('JwtTokenInterceptor', () => {
  let service: AuthorizationHeaderInterceptor;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthorizationHeaderInterceptor);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

// TODO