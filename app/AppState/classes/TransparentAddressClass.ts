import { AddressScopeEnum } from '../../wallet/enums';
import { AddressKindEnum } from '../enums/AddressKindEnum';

export default class TransparentAddressClass {
  index: number;
  address: string;
  addressKind: AddressKindEnum.t;
  scope: AddressScopeEnum;

  constructor(
    index: number,
    address: string,
    addressKind: AddressKindEnum.t,
    scope: AddressScopeEnum,
  ) {
    this.index = index;
    this.address = address;
    this.addressKind = addressKind;
    this.scope = scope;
  }
}
