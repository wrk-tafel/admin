import { TestBed } from '@angular/core/testing';

import { ApiPathInterceptor } from './apipath-interceptor.service';

describe('ApiPathInterceptor', () => {
  let service: ApiPathInterceptor;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiPathInterceptor);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

// TODO