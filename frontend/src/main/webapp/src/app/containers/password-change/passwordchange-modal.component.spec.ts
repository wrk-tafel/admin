import {TestBed, waitForAsync} from '@angular/core/testing';
import {PasswordChangeModalComponent} from './passwordchange-modal.component';
import {ModalModule} from "ngx-bootstrap/modal";

describe('PasswordChangeModalComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ModalModule.forRoot()
      ],
      declarations: [
        PasswordChangeModalComponent
      ]
    }).compileComponents();
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(PasswordChangeModalComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  }));

});
