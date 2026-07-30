import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';

@Service()
export class CarApiService {
  private readonly http = inject(HttpClient);

  getActiveCars(): Observable<CarList> {
    return this.http.get<CarList>('/cars/active');
  }

  getAllCars(): Observable<CarList> {
    return this.http.get<CarList>('/cars');
  }

  updateCar(carId: number, car: CarData): Observable<CarData> {
    return this.http.post<CarData>(`/cars/${carId}`, car);
  }

  createCar(car: CarData): Observable<CarData> {
    return this.http.post<CarData>('/cars', car);
  }

  reorderCars(carIds: number[]): Observable<CarList> {
    return this.http.post<CarList>('/cars/reorder', {carIds});
  }

}

export interface CarList {
  cars: CarData[];
}

export interface CarData {
  id: number;
  licensePlate: string;
  name: string;
  enabled: boolean;
  sortOrder: number;
}
