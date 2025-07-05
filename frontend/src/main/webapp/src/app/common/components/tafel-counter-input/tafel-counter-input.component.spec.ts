import {TestBed, waitForAsync} from '@angular/core/testing';
import {TafelCounterInputComponent} from './tafel-counter-input.component';

describe('TafelCounterInputComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [],
    }).compileComponents();
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(TafelCounterInputComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  }));

});
