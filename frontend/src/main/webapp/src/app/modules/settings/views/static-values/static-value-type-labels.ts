import {StaticValueTypeEnum} from '../../../../api/settings-api.service';

export const staticValueTypeLabels: Record<StaticValueTypeEnum, string> = {
  [StaticValueTypeEnum.INCOME_LIMIT]: 'Einkommensgrenze',
  [StaticValueTypeEnum.ADDITIONAL_ADULT]: 'Zusätzlicher Erwachsener',
  [StaticValueTypeEnum.ADDITIONAL_CHILD]: 'Zusätzliches Kind',
  [StaticValueTypeEnum.TOLERANCE]: 'Toleranz',
  [StaticValueTypeEnum.FAMILY_ALLOWANCE]: 'Familienbeihilfe',
  [StaticValueTypeEnum.CHILD_TAX_ALLOWANCE]: 'Kinderabsetzbetrag',
  [StaticValueTypeEnum.SIBLING_ADDITION]: 'Geschwisterstaffel',
  [StaticValueTypeEnum.COST_CONTRIBUTION]: 'Kostenbeitrag',
  [StaticValueTypeEnum.SCHOOL_STARTER_PACKAGE_AGE_MIN]: 'Schulstartpaket Mindestalter',
  [StaticValueTypeEnum.SCHOOL_STARTER_PACKAGE_AGE_MAX]: 'Schulstartpaket Höchstalter'
};
