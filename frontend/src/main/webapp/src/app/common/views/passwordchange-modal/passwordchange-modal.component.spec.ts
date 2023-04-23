import {ComponentFixture, fakeAsync, TestBed, tick, waitForAsync} from '@angular/core/testing';
import {PasswordChangeModalComponent} from './passwordchange-modal.component';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {PasswordChangeFormComponent} from '../passwordchange-form/passwordchange-form.component';
import {Observable, of} from 'rxjs';
import {ModalModule} from '@coreui/angular';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

describe('PasswordChangeModalComponent', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<PasswordChangeModalComponent>;
  let component: PasswordChangeModalComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ModalModule,
        HttpClientTestingModule,
        BrowserAnimationsModule
      ],
      declarations: [
        PasswordChangeModalComponent
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PasswordChangeModalComponent);
    component = fixture.componentInstance;
  }));

  it('should create the component', waitForAsync(() => {
    expect(component).toBeTruthy();
  }));

  it('showDialog should open the modal dialog', waitForAsync(() => {
    component.form = jasmine.createSpyObj<PasswordChangeFormComponent>(['reset']);
    component.showPwdChangeModal = false;

    component.showDialog();

    expect(component.form.reset).toHaveBeenCalled();
    expect(component.showPwdChangeModal).toBeTruthy();
  }));

  it('hideModalDelayed should hide the modal dialog after a delay', fakeAsync(() => {
    component.showPwdChangeModal = false;

    component.hideModalDelayed();
    expect(component.showPwdChangeModal).toBeFalsy();

    tick(2000);

    expect(component.showPwdChangeModal).toBeFalsy();
  }));

  it('changePassword calls form and hides modal on success', fakeAsync(() => {
    const response: Observable<boolean> = of(true);

    const formMock = jasmine.createSpyObj<PasswordChangeFormComponent>(['changePassword']);
    formMock.changePassword.and.returnValue(response);
    component.form = formMock;
    component.showPwdChangeModal = true;

    component.changePassword();
    tick(2000);

    expect(component.showPwdChangeModal).toBeTruthy();
    expect(component.form.changePassword).toHaveBeenCalled();
  }));

  it('changePassword calls form and doesnt hide modal on failure', fakeAsync(() => {
    const response: Observable<boolean> = of(false);

    const formMock = jasmine.createSpyObj<PasswordChangeFormComponent>(['changePassword']);
    formMock.changePassword.and.returnValue(response);
    component.form = formMock;
    component.showPwdChangeModal = true;

    component.changePassword();
    tick(2000);

    expect(component.showPwdChangeModal).toBeTruthy();
    expect(component.form.changePassword).toHaveBeenCalled();
  }));

});
