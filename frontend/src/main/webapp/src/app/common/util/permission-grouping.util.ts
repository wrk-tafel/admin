const CATEGORY_ORDER = ['Kundenverwaltung', 'Ausgabe & Betrieb', 'Verwaltung', 'Statistik'];

export interface PermissionGroup<T> {
  category: string;
  permissions: T[];
}

export function groupPermissionsByCategory<T extends { category: string }>(permissions: T[]): PermissionGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const permission of permissions) {
    const group = groups.get(permission.category);
    if (group) {
      group.push(permission);
    } else {
      groups.set(permission.category, [permission]);
    }
  }

  const categoryRank = (category: string) => {
    const index = CATEGORY_ORDER.indexOf(category);
    return index === -1 ? CATEGORY_ORDER.length : index;
  };

  return [...groups.entries()]
    .sort(([categoryA], [categoryB]) => categoryRank(categoryA) - categoryRank(categoryB))
    .map(([category, items]) => ({category, permissions: items}));
}
