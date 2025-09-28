import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {ShelterApiService, ShelterListResponse} from '../../../api/shelter-api.service';
import {DashboardSheltersDataResolver} from './dashboard-shelters-resolver-component.service';
import {provideZonelessChangeDetection} from "@angular/core";

describe('DashboardSheltersDataResolver', () => {
  let apiService: jasmine.SpyObj<ShelterApiService>;
  let resolver: DashboardSheltersDataResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ShelterApiService,
          useValue: jasmine.createSpyObj('ShelterApiService', ['getShelters'])
        },
        DashboardSheltersDataResolver
      ]
    });

    apiService = TestBed.inject(ShelterApiService) as jasmine.SpyObj<ShelterApiService>;
    resolver = TestBed.inject(DashboardSheltersDataResolver);
  });

  it('resolve', () => {
    const testResponse: ShelterListResponse = {
      shelters: [
        {
          id: 1,
          name: 'Test Shelter 1',
          addressStreet: 'Test Street',
          addressHouseNumber: '1',
          addressStairway: 'A',
          addressDoor: 'B',
          addressPostalCode: 12345,
          addressCity: 'Test City',
          note: 'Test Note',
          personsCount: 100
        },
        {
          id: 2,
          name: 'Test Shelter 2',
          addressStreet: 'Test Street',
          addressHouseNumber: '1',
          addressStairway: 'A',
          addressDoor: 'B',
          addressPostalCode: 12345,
          addressCity: 'Test City',
          note: 'Test Note 2',
          personsCount: 200
        }
      ]
    };
    apiService.getShelters.and.returnValue(of(testResponse));

    resolver.resolve().subscribe((response: ShelterListResponse) => {
      expect(response).toEqual(testResponse);
    });

    expect(apiService.getShelters).toHaveBeenCalled();
  });

});
