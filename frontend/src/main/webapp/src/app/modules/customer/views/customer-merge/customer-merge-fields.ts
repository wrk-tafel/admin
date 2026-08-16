import {CustomerData, CustomerMergeField, genderLabel} from '../../../../api/customer-api.service';
import {FormatCustomerAddressPipe} from '../../../../common/pipes/format-customer-address.pipe';

export type CustomerMergeFieldKind = 'text' | 'date' | 'currency' | 'boolean';

export interface CustomerMergeFieldDefinition {
  label: string;
  icon?: string;
  kind: CustomerMergeFieldKind;
  read: (customer: CustomerData) => unknown;
}

const formatCustomerAddress = new FormatCustomerAddressPipe();

/**
 * The one place the {@link CustomerMergeField} protocol enum meets UI labels/icons - kept out of
 * customer-api.service.ts on purpose (labels are UI, not wire format). `read()` already returns a
 * display-ready value for fields whose backend type doesn't map to a plain date/currency/boolean
 * (address, lock state, gender, country); `kind` only drives extra formatting for the rest.
 */
export const CUSTOMER_MERGE_FIELDS: Record<CustomerMergeField, CustomerMergeFieldDefinition> = {
  ADDRESS: {
    label: 'Adresse',
    icon: 'location_on',
    kind: 'text',
    read: customer => formatCustomerAddress.transform(customer.address)
  },
  TELEPHONE_NUMBER: {label: 'Telefonnummer', icon: 'call', kind: 'text', read: customer => customer.telephoneNumber},
  EMAIL: {label: 'E-Mail', icon: 'mail', kind: 'text', read: customer => customer.email},
  VALID_UNTIL: {label: 'Gültig bis', kind: 'date', read: customer => customer.validUntil},
  LOCK_STATE: {
    label: 'Sperrstatus',
    kind: 'text',
    read: customer => customer.locked ? `Gesperrt${customer.lockReason ? ' (' + customer.lockReason + ')' : ''}` : 'Nicht gesperrt'
  },
  PENDING_COST_CONTRIBUTION: {
    label: 'Offener Kostenbeitrag',
    icon: 'euro',
    kind: 'currency',
    read: customer => customer.pendingCostContribution
  },
  SINGLE_PARENT: {label: 'Alleinerzieher', kind: 'boolean', read: customer => customer.singleParent},
  MAIN_PERSON_FIRSTNAME: {label: 'Vorname', kind: 'text', read: customer => customer.firstname},
  MAIN_PERSON_LASTNAME: {label: 'Nachname', kind: 'text', read: customer => customer.lastname},
  MAIN_PERSON_BIRTHDATE: {label: 'Geburtsdatum', kind: 'date', read: customer => customer.birthDate},
  MAIN_PERSON_GENDER: {
    label: 'Geschlecht',
    icon: 'wc',
    kind: 'text',
    read: customer => customer.gender ? genderLabel[customer.gender] : undefined
  },
  MAIN_PERSON_COUNTRY: {label: 'Nationalität', icon: 'flag', kind: 'text', read: customer => customer.country?.name},
  MAIN_PERSON_EMPLOYER: {label: 'Arbeitgeber', icon: 'apartment', kind: 'text', read: customer => customer.employer},
  MAIN_PERSON_INCOME: {label: 'Einkommen', icon: 'euro', kind: 'currency', read: customer => customer.income},
  MAIN_PERSON_INCOME_DUE: {label: 'Einkommen nachgewiesen bis', kind: 'date', read: customer => customer.incomeDue},
};

export const ALL_CUSTOMER_MERGE_FIELDS = Object.keys(CUSTOMER_MERGE_FIELDS) as CustomerMergeField[];
