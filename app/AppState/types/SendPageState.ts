export interface ToAddr {
  to: string;
  amount: string;
  amountCurrency: string;
  memo: string;
  includeUAMemo: boolean;
}

export interface SendPageState {
  toaddr: ToAddr;
}

export const emptyToAddr = (): ToAddr => ({
  to: '',
  amount: '',
  amountCurrency: '',
  memo: '',
  includeUAMemo: false,
});

export const emptySendPageState = (): SendPageState => ({
  toaddr: emptyToAddr(),
});
