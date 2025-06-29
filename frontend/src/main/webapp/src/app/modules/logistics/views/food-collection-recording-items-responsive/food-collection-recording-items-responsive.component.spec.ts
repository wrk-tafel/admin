import {TestBed, waitForAsync} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {FoodCollectionRecordingItemsResponsiveComponent} from './food-collection-recording-items-responsive.component';

describe('FoodCollectionRecordingItemsResponsiveComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    }).compileComponents();
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  // TODO test prefill of existing data
  // TODO test save

});
