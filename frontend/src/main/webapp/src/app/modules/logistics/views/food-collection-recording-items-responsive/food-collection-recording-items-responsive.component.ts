import {Component, model} from '@angular/core';
import {RouteData} from '../../../../api/route-api.service';
import {CommonModule} from '@angular/common';
import {FoodCategory} from '../../../../api/food-categories-api.service';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

@Component({
  selector: 'tafel-food-collection-recording-items-responsive',
  templateUrl: 'food-collection-recording-items-responsive.component.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  standalone: true
})
export class FoodCollectionRecordingItemsResponsiveComponent {
  selectedRoute = model.required<RouteData>();
  foodCategories = model.required<FoodCategory[]>();
}
