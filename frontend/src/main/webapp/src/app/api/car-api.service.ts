import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
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
