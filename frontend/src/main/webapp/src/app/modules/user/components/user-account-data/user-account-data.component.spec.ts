import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {of, throwError} from 'rxjs';
import {UserAccountDataComponent} from './user-account-data.component';
import {MfaApiService} from '../../../../api/mfa-api.service';
import {UserAccountData, UserApiService} from '../../../../api/user-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('UserAccountDataComponent', () => {
  let userApiService: MockedObject<UserApiService>;
  let mfaApiService: MockedObject<MfaApiService>;
  let toastr: MockedObject<TafelToastrService>;

  const account: UserAccountData = {
    username: 'max', personnelNumber: '0815', firstname: 'Max', lastname: 'Muster', email: null, mfaEmailEnabled: false
  };
  const accountWithEmailMethod: UserAccountData = {...account, email: 'max@example.org', mfaEmailEnabled: true};

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UserApiService,
          useValue: {
            getAccount: vi.fn().mockName('UserApiService.getAccount').mockReturnValue(of(account)),
            updateAccount: vi.fn().mockName('UserApiService.updateAccount')
          }
        },
        {
          provide: MfaApiService,
          useValue: {sendEmailCode: vi.fn().mockName('MfaApiService.sendEmailCode').mockReturnValue(of(undefined))}
        },
        {
          provide: TafelToastrService,
          useValue: {success: vi.fn(), error: vi.fn()}
        }
      ]
    });
    userApiService = TestBed.inject(UserApiService) as MockedObject<UserApiService>;
    mfaApiService = TestBed.inject(MfaApiService) as MockedObject<MfaApiService>;
    toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
  });

  async function create() {
    const fixture = TestBed.createComponent(UserAccountDataComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  type Fixture = Awaited<ReturnType<typeof create>>;

  const element = (fixture: Fixture, testid: string): HTMLElement | null => fixture.nativeElement.querySelector(`[testid="${testid}"]`);
  const text = (fixture: Fixture, testid: string) => element(fixture, testid)?.textContent?.trim();
  const input = (fixture: Fixture, testid: string) => element(fixture, testid) as HTMLInputElement;
  const button = (fixture: Fixture, testid: string) => element(fixture, testid) as HTMLButtonElement;

  function type(fixture: Fixture, field: 'firstname' | 'lastname' | 'email' | 'mfaCode', value: string) {
    fixture.componentInstance.accountForm[field]().value.set(value);
    fixture.detectChanges();
  }

  function submit(fixture: Fixture) {
    fixture.componentInstance.save(new Event('submit'));
    fixture.detectChanges();
  }

  it('shows the account, with the name and the e-mail in the form and the rest read-only', async () => {
    const fixture = await create();

    expect(text(fixture, 'account-username')).toBe('max');
    expect(text(fixture, 'account-personnel-number')).toBe('0815');
    expect(input(fixture, 'account-firstname').value).toBe('Max');
    expect(input(fixture, 'account-lastname').value).toBe('Muster');
    expect(input(fixture, 'account-email').value).toBe('');
    // nothing changed yet, so there is nothing to save
    expect(button(fixture, 'account-save-button').disabled).toBe(true);
    expect(button(fixture, 'account-discard-button').disabled).toBe(true);
  });

  it('saves the changed name (trimmed) and e-mail, and shows what came back', async () => {
    const fixture = await create();
    const saved: UserAccountData = {...account, firstname: 'Maxi', email: 'maxi@example.org'};
    userApiService.updateAccount.mockReturnValue(of(saved));

    type(fixture, 'firstname', ' Maxi ');
    type(fixture, 'email', 'maxi@example.org');
    expect(button(fixture, 'account-save-button').disabled).toBe(false);

    submit(fixture);

    expect(userApiService.updateAccount).toHaveBeenCalledWith(
      {firstname: 'Maxi', lastname: 'Muster', email: 'maxi@example.org'},
      expect.anything()
    );
    expect(toastr.success).toHaveBeenCalled();
    expect(input(fixture, 'account-firstname').value).toBe('Maxi');
    expect(input(fixture, 'account-email').value).toBe('maxi@example.org');
    expect(button(fixture, 'account-save-button').disabled).toBe(true);
  });

  it('sends an emptied e-mail as no address', async () => {
    userApiService.getAccount.mockReturnValue(of({...account, email: 'max@example.org'}));
    const fixture = await create();
    userApiService.updateAccount.mockReturnValue(of(account));

    type(fixture, 'email', '');
    submit(fixture);

    expect(userApiService.updateAccount).toHaveBeenCalledWith(
      {firstname: 'Max', lastname: 'Muster', email: null},
      expect.anything()
    );
  });

  it('does not save an invalid form, and shows why', async () => {
    const fixture = await create();

    type(fixture, 'lastname', '');
    type(fixture, 'email', 'not-an-address');
    submit(fixture);

    expect(userApiService.updateAccount).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Pflichtfeld');
    expect(fixture.nativeElement.textContent).toContain('E-Mail-Format ungültig');
  });

  it('shows the backend\'s message when saving fails and keeps the input', async () => {
    const fixture = await create();
    userApiService.updateAccount.mockReturnValue(throwError(() => ({status: 400, error: {detail: 'Nicht erlaubt'}})));

    type(fixture, 'firstname', 'Maxi');
    submit(fixture);

    expect(text(fixture, 'account-error-message')).toContain('Nicht erlaubt');
    expect(input(fixture, 'account-firstname').value).toBe('Maxi');
    expect(toastr.success).not.toHaveBeenCalled();
  });

  // With the e-mail method on, the address is where the login codes go: a session that was left open must not be
  // able to redirect it without a code.
  describe('while the e-mail method of two-factor authentication is on', () => {
    beforeEach(() => userApiService.getAccount.mockReturnValue(of(accountWithEmailMethod)));

    it('asks for no code while the address is unchanged', async () => {
      const fixture = await create();

      type(fixture, 'firstname', 'Maxi');

      expect(element(fixture, 'account-mfa-code')).toBeNull();
      userApiService.updateAccount.mockReturnValue(of({...accountWithEmailMethod, firstname: 'Maxi'}));
      submit(fixture);
      expect(userApiService.updateAccount).toHaveBeenCalledWith(
        {firstname: 'Maxi', lastname: 'Muster', email: 'max@example.org'},
        expect.anything()
      );
    });

    it('asks for a code once the address changes, and does not save without one', async () => {
      const fixture = await create();

      type(fixture, 'email', 'new@example.org');

      expect(element(fixture, 'account-code-hint')).not.toBeNull();
      expect(element(fixture, 'account-mfa-code')).not.toBeNull();
      submit(fixture);
      type(fixture, 'mfaCode', '12345');
      submit(fixture);
      expect(userApiService.updateAccount).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain('Der Code besteht aus 6 Ziffern');
    });

    it('sends the code along with the changed address', async () => {
      const fixture = await create();
      userApiService.updateAccount.mockReturnValue(of({...accountWithEmailMethod, email: 'new@example.org'}));

      type(fixture, 'email', 'new@example.org');
      type(fixture, 'mfaCode', '123 456');
      submit(fixture);

      expect(userApiService.updateAccount).toHaveBeenCalledWith(
        {firstname: 'Max', lastname: 'Muster', email: 'new@example.org', mfaCode: '123456'},
        expect.anything()
      );
      // the saved address is the new one, so the code field is gone again
      expect(element(fixture, 'account-mfa-code')).toBeNull();
    });

    it('can have the code sent to the address on record', async () => {
      const fixture = await create();
      type(fixture, 'email', 'new@example.org');

      button(fixture, 'account-send-code-button').click();
      fixture.detectChanges();

      expect(mfaApiService.sendEmailCode).toHaveBeenCalled();
      expect(text(fixture, 'account-info-message')).toContain('bisherige E-Mail-Adresse');
    });

    it('clears the spent code when the backend refuses it, and says why', async () => {
      const fixture = await create();
      userApiService.updateAccount.mockReturnValue(throwError(() => ({status: 400, error: {detail: 'Der Code ist ungültig'}})));

      type(fixture, 'email', 'new@example.org');
      type(fixture, 'mfaCode', '123456');
      submit(fixture);

      expect(text(fixture, 'account-error-message')).toBe('Der Code ist ungültig');
      expect(input(fixture, 'account-mfa-code').value).toBe('');
      expect(input(fixture, 'account-email').value).toBe('new@example.org');
    });
  });

  it('needs no code for an address change while the e-mail method is off', async () => {
    const fixture = await create();
    userApiService.updateAccount.mockReturnValue(of({...account, email: 'new@example.org'}));

    type(fixture, 'email', 'new@example.org');

    expect(element(fixture, 'account-mfa-code')).toBeNull();
    submit(fixture);
    expect(userApiService.updateAccount).toHaveBeenCalledWith(
      {firstname: 'Max', lastname: 'Muster', email: 'new@example.org'},
      expect.anything()
    );
  });

  it('discards the changes back to what is saved', async () => {
    const fixture = await create();

    type(fixture, 'firstname', 'Maxi');
    type(fixture, 'email', 'maxi@example.org');
    button(fixture, 'account-discard-button').click();
    fixture.detectChanges();

    expect(input(fixture, 'account-firstname').value).toBe('Max');
    expect(input(fixture, 'account-email').value).toBe('');
    expect(button(fixture, 'account-save-button').disabled).toBe(true);
  });
});
