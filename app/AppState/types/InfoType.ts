import { ChainNameEnum } from '../enums/ChainNameEnum';
import { CurrencyNameEnum } from '../enums/CurrencyNameEnum';

export default interface InfoType {
  chainName: ChainNameEnum;
  serverUri: string;
  latestBlock: number;
  version: string;
  currencyName: CurrencyNameEnum;
  /** true when the last info fetch failed and the values are the last known good ones. */
  serverUnreachable?: boolean;
}
