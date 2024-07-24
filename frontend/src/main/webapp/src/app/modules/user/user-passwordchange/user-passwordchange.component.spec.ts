import {TestBed, waitForAsync} from '@angular/core/testing';
import {UserPasswordChangeComponent} from './user-passwordchange.component';
import {PasswordChangeFormComponent} from '../../../common/views/passwordchange-form/passwordchange-form.component';
import {of} from 'rxjs';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {CardModule} from '@coreui/angular';

describe('UserPasswordChangeComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        CardModule
      ],
    }).compileComponents();
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(UserPasswordChangeComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('changePassword', () => {
    const fixture = TestBed.createComponent(UserPasswordChangeComponent);
    const component = fixture.componentInstance;
    component.form = TestBed.createComponent(PasswordChangeFormComponent).componentInstance;
    spyOn(component.form, 'changePassword').and.returnValue(of(true));

    component.changePassword();

    expect(component.form.changePassword).toHaveBeenCalled();
  });

  it('isSaveDisabled - form valid', () => {
    const fixture = TestBed.createComponent(UserPasswordChangeComponent);
    const component = fixture.componentInstance;
    component.form = TestBed.createComponent(PasswordChangeFormComponent).componentInstance;
    spyOn(component.form, 'isValid').and.returnValue(true);
    spyOnProperty(component.form.form, 'valid', 'get').and.returnValue(true);

    expect(component.isSaveDisabled()).toBeFalsy();
  });

  it('isSaveDisabled - form invalid', () => {
    const fixture = TestBed.createComponent(UserPasswordChangeComponent);
    const component = fixture.componentInstance;
    component.form = TestBed.createComponent(PasswordChangeFormComponent).componentInstance;
    spyOn(component.form, 'isValid').and.returnValue(false);
    spyOnProperty(component.form.form, 'valid', 'get').and.returnValue(false);

    expect(component.isSaveDisabled()).toBeTruthy();
  });

});
