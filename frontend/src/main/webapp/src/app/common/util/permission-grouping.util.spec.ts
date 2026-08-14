import {buildPermissionOverviewGroups, groupPermissionsByCategory} from './permission-grouping.util';

describe('permission-grouping.util', () => {

  describe('groupPermissionsByCategory', () => {
    it('should group permissions by category', () => {
      const permissions = [
        {key: 'CHECKIN', title: 'Anmeldung', category: 'Ausgabe & Betrieb'},
        {key: 'SETTINGS', title: 'Einstellungen', category: 'Verwaltung'},
        {key: 'SCANNER', title: 'Scanner', category: 'Ausgabe & Betrieb'},
      ];

      const result = groupPermissionsByCategory(permissions);

      expect(result).toEqual([
        {category: 'Ausgabe & Betrieb', permissions: [permissions[0], permissions[2]]},
        {category: 'Verwaltung', permissions: [permissions[1]]},
      ]);
    });

    it('should return an empty array for an empty input', () => {
      expect(groupPermissionsByCategory([])).toEqual([]);
    });

    it('should sort unknown categories after known ones', () => {
      const permissions = [
        {key: 'X', title: 'X', category: 'Sonstiges'},
        {key: 'SUPERVISOR', title: 'Supervisor', category: 'Leitung'},
      ];

      const result = groupPermissionsByCategory(permissions);

      expect(result.map(group => group.category)).toEqual(['Leitung', 'Sonstiges']);
    });
  });

  describe('buildPermissionOverviewGroups', () => {
    const checkin = {key: 'CHECKIN', title: 'Anmeldung', category: 'Ausgabe & Betrieb'};
    const scanner = {key: 'SCANNER', title: 'Scanner', category: 'Ausgabe & Betrieb'};
    const settings = {key: 'SETTINGS', title: 'Einstellungen', category: 'Verwaltung'};
    const supervisor = {key: 'SUPERVISOR', title: 'Supervisor', category: 'Leitung'};
    const allPermissions = [checkin, scanner, settings, supervisor];

    it('flags every catalog permission as granted or not, within a category the user holds something in', () => {
      const result = buildPermissionOverviewGroups(allPermissions, [checkin]);

      expect(result).toEqual([
        {
          category: 'Ausgabe & Betrieb',
          permissions: [
            {permission: checkin, granted: true},
            {permission: scanner, granted: false},
          ],
        },
      ]);
    });

    it('omits a category the user holds no permission in at all', () => {
      const result = buildPermissionOverviewGroups(allPermissions, [checkin]);

      expect(result.map(group => group.category)).not.toContain('Verwaltung');
      expect(result.map(group => group.category)).not.toContain('Leitung');
    });

    it('returns an empty array when the user has no permissions', () => {
      expect(buildPermissionOverviewGroups(allPermissions, [])).toEqual([]);
    });
  });
});
