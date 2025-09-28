import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {FoodCollectionRecordingComponent} from './food-collection-recording.component';
import {BehaviorSubject} from 'rxjs';
import {Router} from '@angular/router';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {DistributionItem} from '../../../../api/distribution-api.service';
import {provideZonelessChangeDetection} from "@angular/core";

describe('FoodCollectionRecordingComponent', () => {
  let router: jasmine.SpyObj<Router>;
  let globalStateService: jasmine.SpyObj<GlobalStateService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
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
  });

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

});
