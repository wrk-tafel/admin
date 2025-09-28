import {TestBed} from '@angular/core/testing';
import {TafelCounterInputComponent} from './tafel-counter-input.component';
import {provideZonelessChangeDetection} from "@angular/core";

describe('TafelCounterInputComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(TafelCounterInputComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

});
