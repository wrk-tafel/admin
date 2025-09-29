import {TestBed, waitForAsync} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {FoodCollectionRecordingItemsDesktopComponent} from './food-collection-recording-items-desktop.component';
import {BehaviorSubject} from 'rxjs';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {DistributionItem} from '../../../../api/distribution-api.service';
import {RouteData} from '../../../../api/route-api.service';
import {FoodCategory} from '../../../../api/food-categories-api.service';

describe('FoodCollectionRecordingItemsDesktopComponent', () => {
  let globalStateService: jasmine.SpyObj<GlobalStateService>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: GlobalStateService,
          useValue: jasmine.createSpyObj('GlobalStateService', ['getCurrentDistribution'])
        }
      ]
    }).compileComponents();

    globalStateService = TestBed.inject(GlobalStateService) as jasmine.SpyObj<GlobalStateService>;
  }));

  const testDistribution: DistributionItem = {
    id: 123,
    startedAt: new Date()
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

  it('ngOnInit - selected route provides category controls', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsDesktopComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    globalStateService.getCurrentDistribution.and.returnValue(new BehaviorSubject<DistributionItem>(testDistribution));

    expect(component.categories.controls).toEqual([]);

    componentRef.setInput('selectedRoute', testRoute);
    componentRef.setInput('foodCategories', testFoodCategories);
    fixture.detectChanges();

    // TODO expect(component.categories.controls.length).toEqual(10);
  });

  // TODO test prefill of existing data
  // TODO test save

});
