import {StaticValueTypeEnum} from '../../../../api/settings-api.service';

export const staticValueTypeLabels: Record<StaticValueTypeEnum, string> = {
  [StaticValueTypeEnum.INCOME_LIMIT]: 'Einkommensgrenze',
  [StaticValueTypeEnum.ADDITIONAL_ADULT]: 'Zusätzlicher Erwachsener',
  [StaticValueTypeEnum.ADDITIONAL_CHILD]: 'Zusätzliches Kind',
  [StaticValueTypeEnum.TOLERANCE]: 'Toleranz',
  [StaticValueTypeEnum.FAMILY_BONUS]: 'Familienbonus',
  [StaticValueTypeEnum.CHILD_TAX_ALLOWANCE]: 'Kinderabsetzbetrag',
  [StaticValueTypeEnum.SIBLING_ADDITION]: 'Geschwisterstaffel',
  [StaticValueTypeEnum.COST_CONTRIBUTION]: 'Kostenbeitrag'
};

export const staticValueTypeOptions = Object.values(StaticValueTypeEnum).map(type => ({
  value: type,
  label: staticValueTypeLabels[type]
}));
