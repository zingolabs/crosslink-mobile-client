import { ChainNameEnum } from '../../AppState';
import { WalletAddressKindEnum } from '../enums/WalletAddressKindEnum';
import { ParseViewKeyStatusEnum } from '../enums/ParseViewKeyStatusEnum';
import { PoolsEnum } from '../enums/PoolsEnum';

export type ParseViewKeyType = {
  status: ParseViewKeyStatusEnum;
  chain_name?: ChainNameEnum;
  address_kind?: WalletAddressKindEnum.ufvkAddressKind;
  pools_available?: PoolsEnum[];
};
