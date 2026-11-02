import { WalletKindEnum } from '../enums/WalletKindEnum';

export type WalletKindType = {
  kind: WalletKindEnum;
  transparent: boolean;
  sapling: boolean;
  orchard: boolean;
};
