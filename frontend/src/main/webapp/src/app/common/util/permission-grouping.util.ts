const CATEGORY_ORDER = ['Ausgabe & Betrieb', 'Logistik', 'Leitung', 'Verwaltung'];

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

export interface PermissionOverviewItem<T> {
  permission: T;
  granted: boolean;
}

export interface PermissionOverviewGroup<T> {
  category: string;
  permissions: PermissionOverviewItem<T>[];
}

/**
 * The "alle anzeigen" view of a user's permissions: every assignable permission, grouped by
 * category, each one flagged whether this user actually holds it - so a category the user is
 * already active in also shows what it doesn't grant them, without opening the edit form.
 *
 * A category the user holds nothing in at all is left out entirely rather than shown fully greyed
 * out: that mirrors the collapsed (granted-only) view, which already omits it, and a category with
 * zero highlighted chips wouldn't answer "what is this user missing" any better than not being
 * there.
 */
export function buildPermissionOverviewGroups<T extends { key: string; category: string }>(
  allPermissions: T[],
  grantedPermissions: T[]
): PermissionOverviewGroup<T>[] {
  const grantedKeys = new Set(grantedPermissions.map(permission => permission.key));

  return groupPermissionsByCategory(allPermissions)
    .filter(group => group.permissions.some(permission => grantedKeys.has(permission.key)))
    .map(group => ({
      category: group.category,
      permissions: group.permissions.map(permission => ({permission, granted: grantedKeys.has(permission.key)})),
    }));
}
