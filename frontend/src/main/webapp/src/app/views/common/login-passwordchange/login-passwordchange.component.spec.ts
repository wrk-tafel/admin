import {TestBed, waitForAsync} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {LoginPasswordChangeComponent} from './login-passwordchange.component';

describe('LoginPasswordChangeComponent', () => {

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [LoginPasswordChangeComponent]
    }).compileComponents();
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(LoginPasswordChangeComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
  }));

});
