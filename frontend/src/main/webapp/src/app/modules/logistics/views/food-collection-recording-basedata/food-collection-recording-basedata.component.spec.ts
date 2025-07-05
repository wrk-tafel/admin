import {TestBed, waitForAsync} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {FoodCollectionRecordingBasedataComponent} from './food-collection-recording-basedata.component';
import {Router} from '@angular/router';
import {GlobalStateService} from '../../../../common/state/global-state.service';

describe('FoodCollectionRecordingBasedataComponent', () => {
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
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingBasedataComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  // TODO effect - route change ?
  // TODO kmValidation ?
  // TODO triggerSearchDriver / triggerSearchCoDriver
  // TODO set selected driver/coDriver ?
  // TODO saveIsDisabled
  // TODO save
  // TODO resetDriver ?
  // TODO resetCoDriver ?
  // TODO test prefill of existing data
  // TODO test save

});
