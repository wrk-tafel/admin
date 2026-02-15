import {TestBed} from '@angular/core/testing';
import {TafelCounterInputComponent} from './tafel-counter-input.component';

describe('TafelCounterInputComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(TafelCounterInputComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

});
