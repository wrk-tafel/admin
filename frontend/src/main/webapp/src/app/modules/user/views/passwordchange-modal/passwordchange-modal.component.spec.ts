import {ComponentFixture, fakeAsync, TestBed, tick, waitForAsync} from '@angular/core/testing';
import {PasswordChangeModalComponent} from './passwordchange-modal.component';
import {ModalDirective, ModalModule} from 'ngx-bootstrap/modal';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {PasswordChangeFormComponent} from '../passwordchange-form/passwordchange-form.component';
import {Observable, of} from 'rxjs';

describe('PasswordChangeModalComponent', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<PasswordChangeModalComponent>;
  let component: PasswordChangeModalComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ModalModule.forRoot(),
        HttpClientTestingModule
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
    component.modal = jasmine.createSpyObj<ModalDirective>(['show']);

    component.showDialog();

    expect(component.form.reset).toHaveBeenCalled();
    expect(component.modal.show).toHaveBeenCalled();
  }));

  it('hideModalDelayed should hide the modal dialog after a delay', fakeAsync(() => {
    component.modal = jasmine.createSpyObj<ModalDirective>(['hide']);

    component.hideModalDelayed();
    expect(component.modal.hide).not.toHaveBeenCalled();

    tick(2000);

    expect(component.modal.hide).toHaveBeenCalled();
  }));

  it('changePassword calls form and hides modal on success', fakeAsync(() => {
    const response: Observable<boolean> = of(true);

    const formMock = jasmine.createSpyObj<PasswordChangeFormComponent>(['changePassword']);
    formMock.changePassword.and.returnValue(response);
    component.form = formMock;
    component.modal = jasmine.createSpyObj<ModalDirective>(['hide']);

    component.changePassword();
    tick(2000);

    expect(component.modal.hide).toHaveBeenCalled();
    expect(component.form.changePassword).toHaveBeenCalled();
  }));

  it('changePassword calls form and doesnt hide modal on failure', fakeAsync(() => {
    const response: Observable<boolean> = of(false);

    const formMock = jasmine.createSpyObj<PasswordChangeFormComponent>(['changePassword']);
    formMock.changePassword.and.returnValue(response);
    component.form = formMock;
    component.modal = jasmine.createSpyObj<ModalDirective>(['hide']);

    component.changePassword();
    tick(2000);

    expect(component.modal.hide).not.toHaveBeenCalled();
    expect(component.form.changePassword).toHaveBeenCalled();
  }));

});
