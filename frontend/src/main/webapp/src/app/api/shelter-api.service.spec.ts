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

  it('get active shelters', () => {
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
          personsCount: 100,
          enabled: true
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
          personsCount: 200,
          enabled: true
        }
      ]
    };

    apiService.getActiveShelters().subscribe((data: ShelterListResponse) => {
      expect(data).toEqual(testResponse);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/shelters/active'});
    req.flush(testResponse);
    httpMock.verify();
  });

  it('get all shelters', () => {
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
          personsCount: 100,
          enabled: true
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
          personsCount: 200,
          enabled: true
        }
      ]
    };

    apiService.getAllShelters().subscribe((data: ShelterListResponse) => {
      expect(data).toEqual(testResponse);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/shelters'});
    req.flush(testResponse);
    httpMock.verify();
  });

  it('update shelter', () => {
    const updatedShelter = {
      id: 1,
      name: 'Updated Shelter',
      addressStreet: 'Test Street',
      addressHouseNumber: '1',
      addressStairway: 'A',
      addressDoor: 'B',
      addressPostalCode: 12345,
      addressCity: 'Test City',
      note: 'Updated Note',
      personsCount: 5
    } as const;

    apiService.updateShelter(1, updatedShelter as any).subscribe((data: any) => {
      expect(data).toEqual(updatedShelter);
    });

    const req = httpMock.expectOne({method: 'POST', url: '/shelters/1'});
    req.flush(updatedShelter);
    httpMock.verify();
  });

});
