import {TestBed, waitForAsync} from '@angular/core/testing';
import {UserSearchComponent} from './user-search.component';

describe('UserSearchComponent', () => {

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        UserSearchComponent
      ]
    }).compileComponents();
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

});
