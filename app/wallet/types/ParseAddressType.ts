import { ChainNameEnum } from '../../AppState';
import { WalletAddressKindEnum } from '../enums/WalletAddressKindEnum';
import { ParseAddressStatusEnum } from '../enums/ParseAddressStatusEnum';
import { ReceiversEnum } from '../enums/ReceiversEnum';

export type ParseAddressType = {
  status: ParseAddressStatusEnum;
  chain_name?: ChainNameEnum;
  address_kind?:
    | WalletAddressKindEnum.unifiedAddressKind
    | WalletAddressKindEnum.saplingAddressKind
    | WalletAddressKindEnum.transparentAddressKind
    | WalletAddressKindEnum.texAddressKind;
  receivers_available?: ReceiversEnum[];
  only_orchard_ua?: string;
};
