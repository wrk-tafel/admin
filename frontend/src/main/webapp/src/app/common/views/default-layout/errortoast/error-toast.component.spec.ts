import {TestBed, waitForAsync} from '@angular/core/testing';
import {ErrorToastComponent} from './error-toast.component';
import {CommonModule} from '@angular/common';

describe('ErrorToastComponent', () => {

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule
      ],
      declarations: [
        ErrorToastComponent
      ],
    }).compileComponents();
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(ErrorToastComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
  }));

});
