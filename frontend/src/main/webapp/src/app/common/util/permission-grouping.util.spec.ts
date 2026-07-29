import {groupPermissionsByCategory} from './permission-grouping.util';

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
});
