import {TestBed, waitForAsync} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {RegisteredCustomersComponent} from './registered-customers.component';
import {By} from '@angular/platform-browser';
import {ModalModule} from '@coreui/angular';

describe('RegisteredCustomersComponent', () => {

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        ModalModule
      ],
      declarations: [
        RegisteredCustomersComponent
      ]
    }).compileComponents();
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(RegisteredCustomersComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('customers count rendered', () => {
    const fixture = TestBed.createComponent(RegisteredCustomersComponent);
    const component = fixture.componentInstance;

    const count = 123;
    component.count = count;

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="customers-count"]')).nativeElement.textContent).toBe(`${count}`);
  });

});
