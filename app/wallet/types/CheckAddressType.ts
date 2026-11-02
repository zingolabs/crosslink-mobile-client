import { AddressScopeEnum } from '../enums/AddressScopeEnum';
import { CheckAddressTypeEnum } from '../enums/CheckAddressTypeEnum';

export type CheckAddressType = {
  is_wallet_address: boolean;
  account_id: number;
  address_type: CheckAddressTypeEnum;
  encoded_address: string;
  address_index?: number;
  has_orchard?: boolean;
  has_sapling?: boolean;
  has_transparent?: boolean;
  diversifier_index?: number;
  scope?: AddressScopeEnum;
};
