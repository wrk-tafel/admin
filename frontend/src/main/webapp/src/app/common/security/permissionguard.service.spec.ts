import { TestBed } from '@angular/core/testing';
import { PermissionGuardService } from './permissionguard.service';

describe('PermissionGuardService', () => {
  let service: PermissionGuardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PermissionGuardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

// TODO