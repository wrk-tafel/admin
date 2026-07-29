import {groupPermissionsByCategory} from './permission-grouping.util';

describe('permission-grouping.util', () => {

  describe('groupPermissionsByCategory', () => {
    it('should group permissions by category', () => {
      const permissions = [
        {key: 'CHECKIN', title: 'Anmeldung', category: 'Ausgabe & Betrieb'},
        {key: 'CUSTOMER', title: 'Kundenverwaltung', category: 'Kundenverwaltung'},
        {key: 'SCANNER', title: 'Scanner', category: 'Ausgabe & Betrieb'},
      ];

      const result = groupPermissionsByCategory(permissions);

      expect(result).toEqual([
        {category: 'Kundenverwaltung', permissions: [permissions[1]]},
        {category: 'Ausgabe & Betrieb', permissions: [permissions[0], permissions[2]]},
      ]);
    });

    it('should return an empty array for an empty input', () => {
      expect(groupPermissionsByCategory([])).toEqual([]);
    });

    it('should sort unknown categories after known ones', () => {
      const permissions = [
        {key: 'X', title: 'X', category: 'Sonstiges'},
        {key: 'STATISTICS', title: 'Statistiken', category: 'Statistik'},
      ];

      const result = groupPermissionsByCategory(permissions);

      expect(result.map(group => group.category)).toEqual(['Statistik', 'Sonstiges']);
    });
  });
});
