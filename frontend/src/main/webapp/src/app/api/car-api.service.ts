import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';

@Service()
export class CarApiService {
  private readonly http = inject(HttpClient);

  getCars(): Observable<CarList> {
    return this.http.get<CarList>('/cars');
  }
}

export interface CarList {
  cars: CarData[];
}

export interface CarData {
  id: number;
  licensePlate: string;
  name: string;
}
