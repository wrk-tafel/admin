import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {ActivatedRouteSnapshot} from '@angular/router';
import {ShelterApiService, ShelterListResponse} from '../../../api/shelter-api.service';
import {ShelterDataResolver} from './shelter-data-resolver.component';

describe('ShelterDataResolver', () => {
  let apiService: MockedObject<ShelterApiService>;
  let resolver: ShelterDataResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ShelterApiService,
          useValue: {
            getActiveShelters: vi.fn().mockName('ShelterApiService.getActiveShelters')
          }
        },
        ShelterDataResolver
      ]
    });

    apiService = TestBed.inject(ShelterApiService) as MockedObject<ShelterApiService>;
    resolver = TestBed.inject(ShelterDataResolver);
  });

  it('resolves the active shelters', () => {
    const shelters: ShelterListResponse = {shelters: []};
    apiService.getActiveShelters.mockReturnValue(of(shelters));

    let result: ShelterListResponse | undefined;
    resolver.resolve(<ActivatedRouteSnapshot><unknown>{}).subscribe(list => result = list);

    expect(result).toEqual(shelters);
  });

});
