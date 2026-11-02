import { AddressScopeEnum } from '../enums/AddressScopeEnum';

export type TransparentAddressType = {
  account: number;
  address_index: number;
  scope: AddressScopeEnum;
  encoded_address: string;
};
