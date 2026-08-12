import {StaticValueTypeEnum} from '../../../../api/settings-api.service';

/**
 * The two unrelated domains the static values fall into. They are maintained on one screen because
 * they are the same kind of record, not because they belong together: everything in `income` feeds
 * the eligibility check, `costContribution` feeds what a household is charged per distribution.
 */
export type StaticValueGroupKey = 'income' | 'costContribution';

export interface StaticValueGroupSpec {
  key: StaticValueGroupKey;
  title: string;
  description: string;
}

export const staticValueGroups: StaticValueGroupSpec[] = [
  {
    key: 'income',
    title: 'Einkommensgrenze',
    description: 'Aus diesen Werten ergibt sich, ab welchem Einkommen ein Haushalt nicht mehr ' +
      'bezugsberechtigt ist: die Grenze selbst, die Zuschläge für größere Haushalte, die Toleranz ' +
      'sowie die Beihilfen, die dem Einkommen hinzugerechnet werden.'
  },
  {
    key: 'costContribution',
    title: 'Unkostenbeitrag',
    description: 'Der Betrag, den ein Haushalt pro Ausgabe beiträgt.'
  }
];

/** A row's columns that actually carry meaning - see [StaticValueTypeSpec.qualifierFields]. */
export type StaticValueQualifierField = 'countAdults' | 'countChildren' | 'age';

export interface StaticValueTypeSpec {
  label: string;
  /** What the value does and where it is applied - the enum label alone presumes domain knowledge. */
  description: string;
  group: StaticValueGroupKey;
  /**
   * What separates the rows of this type from one another. Named per type rather than derived from
   * the row: `count_adults`/`count_children` are set on rows whose type never looks at them (the
   * tolerance row carries `0`/`0`), so reading "every column that is not null" would show numbers
   * that decide nothing.
   */
  qualifierFields: StaticValueQualifierField[];
  /** Column header above [qualifierFields], `null` for a type that has a single, unqualified row. */
  qualifierHeader: string | null;
}

/**
 * Everything the screen knows about a static value type: how to name it, how to explain it, which
 * of the two groups it belongs to and what tells its rows apart. Adding a type to
 * [StaticValueTypeEnum] means adding it here - the screen renders nothing it has no entry for.
 */
export const staticValueTypeSpecs: Record<StaticValueTypeEnum, StaticValueTypeSpec> = {
  [StaticValueTypeEnum.INCOME_LIMIT]: {
    label: 'Einkommensgrenze',
    description: 'Das höchste Einkommen, mit dem ein Haushalt dieser Größe bezugsberechtigt ist. ' +
      'Für größere Haushalte gilt die größte hier erfasste Zusammensetzung, ergänzt um die ' +
      'Zuschläge für weitere Erwachsene bzw. Kinder.',
    group: 'income',
    qualifierFields: ['countAdults', 'countChildren'],
    qualifierHeader: 'Haushalt'
  },
  [StaticValueTypeEnum.ADDITIONAL_ADULT]: {
    label: 'Zusätzlicher Erwachsener',
    description: 'Wird pro weiterem Erwachsenen zur Einkommensgrenze addiert, sobald der Haushalt ' +
      'größer ist als die erfassten Zusammensetzungen.',
    group: 'income',
    qualifierFields: [],
    qualifierHeader: null
  },
  [StaticValueTypeEnum.ADDITIONAL_CHILD]: {
    label: 'Zusätzliches Kind',
    description: 'Wird pro weiterem Kind zur Einkommensgrenze addiert, sobald der Haushalt größer ' +
      'ist als die erfassten Zusammensetzungen.',
    group: 'income',
    qualifierFields: [],
    qualifierHeader: null
  },
  [StaticValueTypeEnum.TOLERANCE]: {
    label: 'Toleranz',
    description: 'Puffer, der zusätzlich auf jede Einkommensgrenze aufgeschlagen wird. Ein ' +
      'Haushalt gilt erst als über dem Limit, wenn er auch diesen Betrag überschreitet.',
    group: 'income',
    qualifierFields: [],
    qualifierHeader: null
  },
  [StaticValueTypeEnum.FAMILY_ALLOWANCE]: {
    label: 'Familienbeihilfe',
    description: 'Wird pro Kind mit Familienbeihilfe dem Einkommen des Haushalts hinzugerechnet. ' +
      'Das Alter ist die Untergrenze: Es gilt der Satz, dessen Alter das Kind bereits erreicht hat.',
    group: 'income',
    qualifierFields: ['age'],
    qualifierHeader: 'Alter des Kindes'
  },
  [StaticValueTypeEnum.CHILD_TAX_ALLOWANCE]: {
    label: 'Kinderabsetzbetrag',
    description: 'Wird pro Kind mit Familienbeihilfe zusätzlich zur Familienbeihilfe dem Einkommen ' +
      'hinzugerechnet - unabhängig vom Alter des Kindes.',
    group: 'income',
    qualifierFields: [],
    qualifierHeader: null
  },
  [StaticValueTypeEnum.SIBLING_ADDITION]: {
    label: 'Geschwisterstaffel',
    description: 'Wird pro Kind dem Einkommen hinzugerechnet, gestaffelt nach der Anzahl der ' +
      'Kinder mit Familienbeihilfe im Haushalt. Ab sieben Kindern gilt die höchste erfasste Stufe.',
    group: 'income',
    qualifierFields: ['countChildren'],
    qualifierHeader: 'Kinder im Haushalt'
  },
  [StaticValueTypeEnum.COST_CONTRIBUTION]: {
    label: 'Kostenbeitrag',
    description: 'Wird einem Haushalt nach jeder Ausgabe als offener Unkostenbeitrag angeschrieben, ' +
      'bei der er nicht bezahlt hat.',
    group: 'costContribution',
    qualifierFields: [],
    qualifierHeader: null
  }
};
