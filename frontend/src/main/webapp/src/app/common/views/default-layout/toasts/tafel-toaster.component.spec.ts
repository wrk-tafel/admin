import {TestBed, waitForAsync} from '@angular/core/testing';
import {TafelToasterComponent} from './tafel-toaster.component';
import {CommonModule} from '@angular/common';

describe('TafelToasterComponent', () => {

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule
      ],
      declarations: [
        TafelToasterComponent
      ],
    }).compileComponents();
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(TafelToasterComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
  }));

});
