import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {ShelterApiService, ShelterListResponse} from './shelter-api.service';

describe('ShelterApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: ShelterApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(ShelterApiService);
  });

  it('get shelters', () => {
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

    apiService.getShelters().subscribe((data: ShelterListResponse) => {
      expect(data).toEqual(testResponse);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/shelters'});
    req.flush(testResponse);
    httpMock.verify();
  });

});
