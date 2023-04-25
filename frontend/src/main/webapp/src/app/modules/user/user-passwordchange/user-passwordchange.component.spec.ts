import {TestBed, waitForAsync} from '@angular/core/testing';
import {UserPasswordChangeComponent} from './user-passwordchange.component';

describe('UserPasswordChangeComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        UserPasswordChangeComponent
      ]
    }).compileComponents();
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(UserPasswordChangeComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

});
