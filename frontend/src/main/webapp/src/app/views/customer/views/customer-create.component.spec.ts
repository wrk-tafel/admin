import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CustomerCreateComponent } from './customer-create.component';

describe('CustomerCreateComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        CustomerCreateComponent
      ],
      imports: [RouterTestingModule]
    }).compileComponents();
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(CustomerCreateComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  }));

});
