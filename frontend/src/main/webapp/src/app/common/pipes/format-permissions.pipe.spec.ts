import {FormatPermissionsPipe} from './format-permissions.pipe';
import {UserData, UserPermission} from '../../api/user-api.service';

describe('FormatPermissionsPipe', () => {
  let pipe: FormatPermissionsPipe;

  beforeEach(() => {
    pipe = new FormatPermissionsPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should format single permission', () => {
    const permission: UserPermission = {
      key: 'CUSTOMER',
      title: 'Kundenverwaltung'
    };
    const userData: Partial<UserData> = {
      permissions: [permission]
    };

    const result = pipe.transform(userData as UserData);

    expect(result).toBe('Kundenverwaltung');
  });

  it('should format multiple permissions', () => {
    const permissions: UserPermission[] = [
      {key: 'CUSTOMER', title: 'Kundenverwaltung'},
      {key: 'CHECKIN', title: 'Check-in'},
      {key: 'LOGISTICS', title: 'Logistik'}
    ];
    const userData: Partial<UserData> = {
      permissions: permissions
    };

    const result = pipe.transform(userData as UserData);

    expect(result).toBe('Kundenverwaltung, Check-in, Logistik');
  });

  it('should return empty string for user with no permissions', () => {
    const userData: Partial<UserData> = {
      permissions: []
    };

    const result = pipe.transform(userData as UserData);

    expect(result).toBe('');
  });

  it('should return empty string for user with undefined permissions', () => {
    const userData: Partial<UserData> = {
      permissions: undefined
    };

    const result = pipe.transform(userData as UserData);

    expect(result).toBe('');
  });

  it('should return empty string for undefined userData', () => {
    const result = pipe.transform(undefined);

    expect(result).toBe('');
  });

  it('should return empty string for null userData', () => {
    const result = pipe.transform(null);

    expect(result).toBe('');
  });

  it('should format all standard permissions correctly', () => {
    const permissions: UserPermission[] = [
      {key: 'CUSTOMER', title: 'Kundenverwaltung'},
      {key: 'SCANNER', title: 'Scanner'},
      {key: 'CHECKIN', title: 'Check-in'},
      {key: 'LOGISTICS', title: 'Logistik'},
      {key: 'USER_MANAGEMENT', title: 'Benutzerverwaltung'},
      {key: 'SETTINGS', title: 'Einstellungen'}
    ];
    const userData: Partial<UserData> = {
      permissions: permissions
    };

    const result = pipe.transform(userData as UserData);

    expect(result).toBe('Kundenverwaltung, Scanner, Check-in, Logistik, Benutzerverwaltung, Einstellungen');
  });
});
