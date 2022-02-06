import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AppConfigService } from './appconfig.service';

describe('AppConfigService', () => {
  let client: HttpClient
  let service: AppConfigService

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(AppConfigService);
    client = TestBed.inject(HttpClient)
  });

  it('should be created', () => {
    // TODO expect(service).toBeTruthy();
  });
});
