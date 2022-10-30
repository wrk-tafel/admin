import {fakeAsync, TestBed, tick, waitForAsync} from '@angular/core/testing';
import {PasswordChangeModalComponent} from './passwordchange-modal.component';
import {ModalDirective, ModalModule} from "ngx-bootstrap/modal";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {FormControl, FormGroup} from "@angular/forms";

describe('PasswordChangeModalComponent', () => {
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
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(PasswordChangeModalComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  }));

  it('showDialog should open the modal dialog', waitForAsync(() => {
    const fixture = TestBed.createComponent(PasswordChangeModalComponent);
    const component = fixture.componentInstance;
    component.form = jasmine.createSpyObj<FormGroup>(['reset']);
    component.modal = jasmine.createSpyObj<ModalDirective>(['show']);

    component.showDialog();

    expect(component.form.reset).toHaveBeenCalled();
    expect(component.modal.show).toHaveBeenCalled();
  }));

  it('hideModalDelayed should hide the modal dialog after a delay', fakeAsync(() => {
    const fixture = TestBed.createComponent(PasswordChangeModalComponent);
    const component = fixture.componentInstance;
    component.modal = jasmine.createSpyObj<ModalDirective>(['hide']);

    component.hideModalDelayed();
    expect(component.modal.hide).not.toHaveBeenCalled();

    tick(2000);

    expect(component.modal.hide).toHaveBeenCalled();
  }));

  it('validateNewAndRepeatedPasswords should return null on matching values', waitForAsync(() => {
    const fixture = TestBed.createComponent(PasswordChangeModalComponent);
    const component = fixture.componentInstance;
    const validator = component.validateNewAndRepeatedPasswords;

    const testForm = new FormGroup({
      newPassword: new FormControl('12345'),
      newRepeatedPassword: new FormControl('12345')
    });

    const result = validator(testForm);

    expect(result).toBe(null);
  }));

  it('validateNewAndRepeatedPasswords should return object when values dont match', waitForAsync(() => {
    const fixture = TestBed.createComponent(PasswordChangeModalComponent);
    const component = fixture.componentInstance;
    const validator = component.validateNewAndRepeatedPasswords;

    const testForm = new FormGroup({
      newPassword: new FormControl('12345'),
      newRepeatedPassword: new FormControl('67890')
    });

    const result = validator(testForm);

    expect(result).toEqual({passwordsDontMatch: true});
  }));

});
