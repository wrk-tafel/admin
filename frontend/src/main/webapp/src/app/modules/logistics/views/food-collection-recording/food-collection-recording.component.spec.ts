import {TestBed, waitForAsync} from "@angular/core/testing";
import {NoopAnimationsModule} from "@angular/platform-browser/animations";
import {provideHttpClient} from "@angular/common/http";
import {provideHttpClientTesting} from "@angular/common/http/testing";
import {FoodCollectionRecordingComponent} from "./food-collection-recording.component";
import {BehaviorSubject} from "rxjs";
import {Router} from "@angular/router";
import {GlobalStateService} from "../../../../common/state/global-state.service";
import {DistributionItem} from "../../../../api/distribution-api.service";
import {RouteList} from "../../../../api/route-api.service";
import {FoodCategory} from "../../../../api/food-categories-api.service";

describe('FoodCollectionRecordingComponent', () => {
  let router: jasmine.SpyObj<Router>;
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
          provide: Router,
          useValue: jasmine.createSpyObj('Router', ['navigate'])
        },
        {
          provide: GlobalStateService,
          useValue: jasmine.createSpyObj('GlobalStateService', ['getCurrentDistribution'])
        }
      ]
    }).compileComponents();

    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    globalStateService = TestBed.inject(GlobalStateService) as jasmine.SpyObj<GlobalStateService>;
  }));

  const testDistribution = {
    id: 123,
    state: {
      name: 'OPEN',
      stateLabel: 'Offen',
      actionLabel: 'Offen'
    }
  };
  const testRouteList: RouteList = {
    routes: [
      {
        id: 0,
        name: 'Route 1',
        shops: [
          {id: 0, number: 111, name: 'Shop 1'},
          {id: 1, number: 222, name: 'Shop 2'}
        ]
      }
    ]
  };
  const testFoodCategories: FoodCategory[] = [
    {id: 0, name: 'Category 1'},
    {id: 1, name: 'Category 2'}
  ];

  it('component can be created', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('ngOnInit without active distribution', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
    const component = fixture.componentInstance;
    globalStateService.getCurrentDistribution.and.returnValue(new BehaviorSubject<DistributionItem>(null));

    component.ngOnInit();

    expect(router.navigate).toHaveBeenCalledWith(['uebersicht']);
  });

  // TODO onInit - route change ?
  it('ngOnInit - selected route provides category controls', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    globalStateService.getCurrentDistribution.and.returnValue(new BehaviorSubject<DistributionItem>(testDistribution));
    componentRef.setInput('routeList', testRouteList);
    componentRef.setInput('foodCategories', testFoodCategories);

    component.ngOnInit();

    expect(component.categories.controls).toEqual([]);
    component.route.setValue(testRouteList[0]);

    // TODO expect(component.categories.controls.length).toEqual(10);
  });

  // TODO kmValidation ?
  // TODO triggerSearchDriver / triggerSearchCoDriver
  // TODO set selected driver/coDriver ?
  // TODO saveIsDisabled
  // TODO save
  // TODO resetDriver ?
  // TODO resetCoDriver ?
  // TODO test prefill of existing data

});
