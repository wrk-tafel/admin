import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CustomerEditComponent } from './customer-edit.component';

describe('CustomerEditComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        CustomerEditComponent
      ],
      imports: [RouterTestingModule]
    }).compileComponents();
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  }));

});
