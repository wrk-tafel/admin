import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {FoodCollectionRecordingItemsDesktopComponent} from './food-collection-recording-items-desktop.component';
import {BehaviorSubject} from 'rxjs';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {DistributionItem} from '../../../../api/distribution-api.service';
import {RouteData} from '../../../../api/route-api.service';
import {FoodCategory} from '../../../../api/food-categories-api.service';
import {provideZonelessChangeDetection} from "@angular/core";

describe('FoodCollectionRecordingItemsDesktopComponent', () => {
  let globalStateService: jasmine.SpyObj<GlobalStateService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: GlobalStateService,
          useValue: jasmine.createSpyObj('GlobalStateService', ['getCurrentDistribution'])
        }
      ]
    }).compileComponents();

    globalStateService = TestBed.inject(GlobalStateService) as jasmine.SpyObj<GlobalStateService>;
  });

  const testDistribution = {
    id: 123,
    state: {
      name: 'OPEN',
      stateLabel: 'Offen',
      actionLabel: 'Offen'
    }
  };
  const testRoute: RouteData = {
    id: 0,
    name: 'Route 1'
  };
  const testFoodCategories: FoodCategory[] = [
    {id: 0, name: 'Category 1', returnItem: false},
    {id: 1, name: 'Category 2', returnItem: true},
  ];

  it('component can be created', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsDesktopComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('ngOnInit - selected route provides category controls', async () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsDesktopComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    globalStateService.getCurrentDistribution.and.returnValue(new BehaviorSubject<DistributionItem>(testDistribution));

    expect(component.categories.controls).toEqual([]);

    componentRef.setInput('selectedRoute', testRoute);
    componentRef.setInput('foodCategories', testFoodCategories);
    await fixture.whenStable();

    // TODO expect(component.categories.controls.length).toEqual(10);
  });

  // TODO test prefill of existing data
  // TODO test save

});
