import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {of, throwError} from 'rxjs';
import {UserAccountDataComponent} from './user-account-data.component';
import {UserAccountData, UserApiService} from '../../../../api/user-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('UserAccountDataComponent', () => {
  let userApiService: MockedObject<UserApiService>;
  let toastr: MockedObject<TafelToastrService>;

  const account: UserAccountData = {username: 'max', personnelNumber: '0815', firstname: 'Max', lastname: 'Muster', email: null};

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
          provide: TafelToastrService,
          useValue: {success: vi.fn(), error: vi.fn()}
        }
      ]
    });
    userApiService = TestBed.inject(UserApiService) as MockedObject<UserApiService>;
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

  function type(fixture: Fixture, field: 'firstname' | 'lastname' | 'email', value: string) {
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
