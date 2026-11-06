/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  Keyboard,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  NativeSyntheticEvent,
  TextInputEndEditingEventData,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import {
  faQrcode,
  faCheck,
  faArrowDown,
  faInfoCircle,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useNavigation } from '@react-navigation/native';

import FadeText from '../Components/FadeText';
import ErrorText from '../Components/ErrorText';
import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import {
  emptySendPageState,
  emptyToAddr,
  SendPageState,
  ChainNameEnum,
  GlobalConst,
  ServerType,
  SelectServerEnum,
  RouteEnum,
  SecurityType,
  ScreenEnum,
} from '../../app/AppState';
import { parseZcashURI } from '../../app/uris';
import WalletService from '../../app/wallet';
import Utils from '../../app/utils';
import { SessionStackParamList } from '../../app/types';
import {
  useFeedback,
  useSession,
  useSettings,
  useStatus,
  useWalletData,
} from '../../app/store';
import { createAlert } from '../../app/createAlert';
import { SendProposeType } from '../../app/wallet/types';
import { SpendablebalanceType } from '../../app/wallet/types';
import { ToastProvider, useToast } from 'react-native-toastier';
import Snackbars from '../Components/Snackbars';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Wallet from '../../assets/icons/wallet.svg';
import { HeaderTitle } from '../Header';
import { XIcon } from '../Components/Icons/XIcon';
import LiquidPrimaryButton from '../Components/LiquidButton/LiquidPrimaryButton';
import { useTheme } from '../../app/theme';
import { report } from '../../app/reporting';

type SendProps = NativeStackScreenProps<
  SessionStackParamList,
  RouteEnum.Send
> & {
  setShieldingAmount: (value: number) => void;
  setScrollToTop: (value: boolean) => void;
  setScrollToBottom: (value: boolean) => void;
  sendTransaction: (s: SendPageState) => Promise<String>;
  setServerOption: (
    value: ServerType,
    selectServer: SelectServerEnum,
    toast: boolean,
    sameServerChainName: boolean,
  ) => Promise<void>;
  setSecurityOption: (s: SecurityType) => Promise<void>;
};

type SpendabilityState = {
  spendable: number;
  maxAmount: number;
  loading: boolean;
  error: string;
};

type AddressCheck = { address: string; chain: string; valid: boolean };
type MemoCheck = { address: string; chain: string; enabled: boolean };
type DonationCheck = { address: string; isDonation: boolean };
type AddressSendability = {
  address: string;
  spendable: number | null;
  error: string;
};
type Proposal = { fee: number; error: string; amountText?: string };

const Send: React.FunctionComponent<SendProps> = ({
  sendTransaction,
  setScrollToTop,
  setScrollToBottom,
  route,
}) => {
  const navigation: any = useNavigation();
  const {
    translate,
    setBackgroundError,
    addLastSnackbar,
    removeFirstSnackbar,
  } = useFeedback();
  const { privacy, indexerServer, donation, selectIndexerServer } =
    useSettings();
  const { zenniesDonationAddress } = useSession();
  const { info, totalBalance, somePending, defaultUnifiedAddress } =
    useWalletData();
  const { zecPrice, netInfo } = useStatus();
  const draft = route.params?.toaddr;
  const { snackbars } = useFeedback();

  const { colors } = useTheme();
  const { clear } = useToast();
  const screenName = ScreenEnum.Send;
  const insets = useSafeAreaInsets();
  const maxW = 520;

  const [addressText, setAddressText] = useState<string>(draft?.to ?? '');
  const [memoText, setMemoText] = useState<string>(draft?.memo ?? '');
  const [amountText, setAmountText] = useState<string>(draft?.amount ?? '');
  const [amountCurrencyText, setAmountCurrencyText] = useState<string>(
    draft?.amountCurrency ?? '',
  );
  const [includeUAMemoBoolean, setIncludeUAMemoBoolean] = useState<boolean>(
    draft?.includeUAMemo ?? false,
  );
  const [stage, setStage] = useState<'Send to' | 'Send'>('Send to');
  const [kbOpen, setKbOpen] = React.useState(false);
  const [addressCheck, setAddressCheck] = useState<AddressCheck | null>(null);
  const [memoCheck, setMemoCheck] = useState<MemoCheck | null>(null);
  const [donationCheck, setDonationCheck] = useState<DonationCheck | null>(
    null,
  );
  const [addressSendability, setAddressSendability] =
    useState<AddressSendability | null>(null);
  const [proposal, setProposal] = useState<Proposal>({ fee: 0, error: '' });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [seenDraft, setSeenDraft] = useState(draft);
  const [seenAddress, setSeenAddress] = useState(addressText);

  if (draft !== seenDraft) {
    setSeenDraft(draft);
    if (draft) {
      setAddressText(draft.to);
      setAmountText(draft.amount);
      setAmountCurrencyText(draft.amountCurrency);
      setMemoText(draft.memo);
      setIncludeUAMemoBoolean(draft.includeUAMemo);
    }
  }
  if (addressText !== seenAddress) {
    setSeenAddress(addressText);
    if (!addressText) {
      setMemoText('');
    }
  }

  const validAddress: number = !addressText
    ? 0
    : addressCheck?.address === addressText &&
        addressCheck.chain === indexerServer.chainName
      ? addressCheck.valid
        ? 1
        : -1
      : 0;
  const memoEnabled: boolean =
    !!addressText &&
    memoCheck?.address === addressText &&
    memoCheck.chain === indexerServer.chainName
      ? memoCheck.enabled
      : false;
  const donationAddress: boolean =
    !!addressText && donationCheck?.address === addressText
      ? donationCheck.isDonation
      : false;
  if (stage === 'Send' && (!addressText || validAddress !== 1)) {
    setStage('Send to');
  }
  const title = stage;

  const getBaseSpendable = useCallback((): number => {
    return totalBalance ? totalBalance.totalSpendableBalance : 0;
  }, [totalBalance]);

  const getBaseMaxAmount = useCallback((): number => {
    const baseSpendable = getBaseSpendable();
    const donationAdjustment =
      donation &&
      indexerServer.chainName === ChainNameEnum.mainChainName &&
      !donationAddress
        ? Utils.parseStringLocaleToNumberFloat(Utils.getZenniesDonationAmount())
        : 0;

    const nextMax = baseSpendable - donationAdjustment;
    return nextMax > 0 ? nextMax : 0;
  }, [donation, donationAddress, getBaseSpendable, indexerServer.chainName]);

  const wantsAddressSendability =
    !!addressText &&
    validAddress === 1 &&
    !addressText.toLowerCase().startsWith(GlobalConst.zcash);
  const globalSpendable = getBaseSpendable();
  const globalMaxAmount = getBaseMaxAmount();
  let sendability: SpendabilityState = {
    spendable: globalSpendable,
    maxAmount: globalMaxAmount,
    loading: false,
    error: '',
  };
  if (wantsAddressSendability) {
    if (addressSendability?.address !== addressText) {
      sendability = { ...sendability, loading: true };
    } else {
      const spendable = addressSendability.spendable ?? globalSpendable;
      sendability = {
        spendable,
        maxAmount: spendable > 0 ? spendable : 0,
        loading: false,
        error: addressSendability.error,
      };
    }
  }
  const negativeMaxAmount = sendability.maxAmount <= 0;

  const stillConfirming =
    (totalBalance ? totalBalance.totalOrchardBalance : 0) !==
      (totalBalance ? totalBalance.confirmedOrchardBalance : 0) ||
    (totalBalance ? totalBalance.totalSaplingBalance : 0) !==
      (totalBalance ? totalBalance.confirmedSaplingBalance : 0) ||
    somePending;

  const validMemo: number =
    memoText || includeUAMemoBoolean
      ? Utils.countMemoBytes(
          memoText,
          includeUAMemoBoolean,
          defaultUnifiedAddress,
        ) > GlobalConst.memoMaxLength
        ? -1
        : 1
      : 0;

  let validAmount = 0;
  if (
    amountCurrencyText !== '' &&
    isNaN(Utils.parseStringLocaleToNumberFloat(amountCurrencyText))
  ) {
    validAmount = -1;
  } else if (amountText !== '') {
    const parsed = Utils.parseStringLocaleToNumberFloat(amountText);
    validAmount = isNaN(parsed)
      ? -1
      : parsed >= 0 &&
          parsed <=
            Utils.parseStringLocaleToNumberFloat(
              sendability.maxAmount.toFixed(8),
            )
        ? 1
        : -2;
  }

  const feeInputsValid =
    !!addressText &&
    validAddress === 1 &&
    amountText !== '' &&
    !isNaN(Utils.parseStringLocaleToNumberFloat(amountText)) &&
    validMemo !== -1;
  const fee = feeInputsValid ? proposal.fee : 0;
  const proposeSendLastError = feeInputsValid ? proposal.error : '';

  const sendButtonEnabled =
    validAddress === 1 &&
    validAmount === 1 &&
    validMemo !== -1 &&
    fee > 0 &&
    sendability.maxAmount > 0 &&
    !(!memoEnabled && Utils.parseStringLocaleToNumberFloat(amountText) === 0);

  const updateToFieldRef = useRef<typeof updateToField>(async () => {});

  const runSendPropose = async (proposeJSON: string): Promise<string> => {
    try {
      const proposeStr: string = await WalletService.sendProcess(proposeJSON);
      if (proposeStr) {
        if (proposeStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error propose ${proposeStr}`);
          return proposeStr;
        }
      } else {
        console.log('Internal Error propose');
        return 'Error: Internal RPC Error: propose';
      }

      return proposeStr;
    } catch (error) {
      console.log(`Critical Error propose ${error}`);
      return `Error: ${error}`;
    }
  };

  const calculateFeeWithPropose = useCallback(
    async (
      amountPar: string,
      addressPar: string,
      memoPar: string,
      includeUAMemoPar: boolean,
      addressIsValid: boolean,
      memoIsValid: boolean,
    ): Promise<Proposal | null> => {
      if (!addressPar || !addressIsValid) {
        return null;
      }

      if (amountPar === '') {
        return null;
      }

      const parsedAmount = Utils.parseStringLocaleToNumberFloat(amountPar);
      if (isNaN(parsedAmount)) {
        return null;
      }

      if (!memoIsValid) {
        return null;
      }

      const sendPageStateCalculateFee = emptySendPageState();
      sendPageStateCalculateFee.toaddr.to = addressPar;
      sendPageStateCalculateFee.toaddr.memo = memoPar;
      sendPageStateCalculateFee.toaddr.includeUAMemo = includeUAMemoPar;
      sendPageStateCalculateFee.toaddr.amount = amountPar;

      const sendJson = await Utils.getSendManyJSON(
        sendPageStateCalculateFee,
        defaultUnifiedAddress,
        indexerServer,
        donation,
      );

      const runProposeStr = await runSendPropose(JSON.stringify(sendJson));

      if (
        runProposeStr &&
        runProposeStr.toLowerCase().startsWith(GlobalConst.error)
      ) {
        return { fee: 0, error: runProposeStr };
      }

      try {
        const runProposeJson: SendProposeType = JSON.parse(runProposeStr);

        if (runProposeJson.error) {
          return { fee: 0, error: runProposeJson.error };
        }

        const result: Proposal = {
          fee:
            runProposeJson.fee !== undefined ? runProposeJson.fee / 10 ** 8 : 0,
          error: '',
        };

        if (runProposeJson.amount !== undefined) {
          const newAmount =
            runProposeJson.amount / 10 ** 8 -
            (donation &&
            indexerServer.chainName === ChainNameEnum.mainChainName &&
            !donationAddress
              ? Utils.parseStringLocaleToNumberFloat(
                  Utils.getZenniesDonationAmount(),
                )
              : 0);
          result.amountText = Utils.parseNumberFloatToStringLocale(
            newAmount,
            8,
          );
        }
        return result;
      } catch {
        return { fee: 0, error: runProposeStr };
      }
    },
    [defaultUnifiedAddress, donation, donationAddress, indexerServer],
  );

  const updateToField = async (
    addressPar: string | null,
    amountPar: string | null,
    amountCurrencyPar: string | null,
    memoPar: string | null,
    includeUAMemoPar: boolean | null,
  ) => {
    if (addressPar !== null) {
      if (
        addressPar.toLowerCase().startsWith(GlobalConst.zcash) ||
        addressPar.toLowerCase().includes(':')
      ) {
        const { error, target } = await parseZcashURI(
          addressPar,
          translate,
          indexerServer,
        );

        if (target) {
          [target].forEach(tgt => {
            setAddressText(tgt.address || '');
            setAmountText(
              tgt.amount
                ? Utils.parseNumberFloatToStringLocale(tgt.amount, 8)
                : '',
            );
            setMemoText(tgt.memoString || '');
          });
        }

        if (error) {
          addLastSnackbar({ message: error, screenName: [screenName] });
        }
      } else {
        setAddressText(addressPar.replace(/[ \t\n\r]+/g, ''));
      }
    }

    if (amountPar !== null) {
      const amountTemp = amountPar.substring(0, 20);

      if (isNaN(Utils.parseStringLocaleToNumberFloat(amountTemp))) {
        setAmountCurrencyText('');
      } else if (amountTemp && zecPrice && zecPrice.zecPrice > 0) {
        setAmountCurrencyText(
          Utils.parseNumberFloatToStringLocale(
            Utils.parseStringLocaleToNumberFloat(amountTemp) *
              zecPrice.zecPrice,
            2,
          ),
        );
      } else {
        setAmountCurrencyText('');
      }

      setAmountText(amountTemp);
    }

    if (amountCurrencyPar !== null) {
      const amountCurrencyTemp = amountCurrencyPar.substring(0, 15);

      if (isNaN(Utils.parseStringLocaleToNumberFloat(amountCurrencyTemp))) {
        setAmountText('');
      } else if (amountCurrencyTemp && zecPrice && zecPrice.zecPrice > 0) {
        setAmountText(
          Utils.parseNumberFloatToStringLocale(
            Utils.parseStringLocaleToNumberFloat(amountCurrencyTemp) /
              zecPrice.zecPrice,
            8,
          ),
        );
      } else {
        setAmountText('');
      }

      setAmountCurrencyText(amountCurrencyTemp);
    }

    if (memoPar !== null) {
      setMemoText(memoPar);
    }

    if (includeUAMemoPar !== null) {
      setIncludeUAMemoBoolean(includeUAMemoPar);
    }
  };

  useEffect(() => {
    updateToFieldRef.current = updateToField;
  });

  useEffect(() => {
    const s1 = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true));
    const s2 = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

  useEffect(() => {
    if (!addressText) {
      return;
    }
    let cancelled = false;
    const address = addressText;
    const chain = indexerServer.chainName;
    Utils.isValidAddress(address, chain).then(r => {
      if (!cancelled) {
        setAddressCheck({ address, chain, valid: r.isValid });
      }
    });
    Utils.isValidOrchardOrSaplingAddress(address, chain).then(r => {
      if (cancelled) {
        return;
      }
      setMemoCheck({ address, chain, enabled: r });
      if (!r) {
        setMemoText('');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [addressText, indexerServer.chainName]);

  useEffect(() => {
    if (!addressText) {
      return;
    }
    let cancelled = false;
    const address = addressText;
    const chain = indexerServer.chainName;
    (async () => {
      const isDonation =
        address === (await Utils.getDonationAddress(chain)) ||
        address === zenniesDonationAddress ||
        address === (await Utils.getNymDonationAddress(chain));
      if (!cancelled) {
        setDonationCheck({ address, isDonation });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addressText, indexerServer.chainName, zenniesDonationAddress]);

  useEffect(() => {
    if (!wantsAddressSendability) {
      return;
    }
    let cancelled = false;
    const address = addressText;
    const zenniesForZingo = donationAddress ? false : donation;
    (async () => {
      const runSpendableBalanceStr =
        await WalletService.getSpendableBalanceWithAddressInfo(
          address,
          zenniesForZingo ? 'true' : 'false',
        );
      if (cancelled) {
        return;
      }
      if (
        runSpendableBalanceStr &&
        runSpendableBalanceStr.toLowerCase().startsWith(GlobalConst.error)
      ) {
        setAddressSendability({
          address,
          spendable: null,
          error: runSpendableBalanceStr,
        });
        return;
      }
      try {
        const runSpendableBalanceJson: SpendablebalanceType = JSON.parse(
          runSpendableBalanceStr,
        );
        setAddressSendability({
          address,
          spendable:
            runSpendableBalanceJson.spendable_balance !== undefined
              ? runSpendableBalanceJson.spendable_balance / 10 ** 8
              : null,
          error: '',
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setAddressSendability({
          address,
          spendable: null,
          error: `${runSpendableBalanceStr} ${message}`,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wantsAddressSendability, addressText, donation, donationAddress]);

  useEffect(() => {
    let cancelled = false;
    calculateFeeWithPropose(
      amountText,
      addressText,
      memoText,
      includeUAMemoBoolean,
      validAddress === 1,
      validMemo !== -1,
    ).then(result => {
      if (cancelled || !result) {
        return;
      }
      setProposal(result);
      if (result.amountText !== undefined) {
        updateToFieldRef.current(null, result.amountText, null, null, null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    amountText,
    addressText,
    memoText,
    includeUAMemoBoolean,
    validAddress,
    validMemo,
    calculateFeeWithPropose,
  ]);

  const clearState = () => {
    setAddressText('');
    setAmountText('');
    setAmountCurrencyText('');
    setMemoText('');
    setIncludeUAMemoBoolean(false);
    navigation.setParams({ toaddr: emptyToAddr() });
  };

  const buildSendState = (): SendPageState => ({
    toaddr: {
      to: addressText,
      amount: amountText,
      amountCurrency: amountCurrencyText,
      memo: memoText,
      includeUAMemo: includeUAMemoBoolean,
    },
  });

  const interceptCustomError = (error: string) => {
    if (
      error.includes('18: bad-txns-sapling-duplicate-nullifier') ||
      error.includes('18: bad-txns-sprout-duplicate-nullifier') ||
      error.includes('18: bad-txns-orchard-duplicate-nullifier')
    ) {
      return translate('send.duplicate-nullifier-error') as string;
    } else if (error.includes('64: dust')) {
      return translate('send.dust-error') as string;
    }
  };

  const confirmSend = async (sendPageStatePar: SendPageState) => {
    if (
      !netInfo.isConnected ||
      selectIndexerServer === SelectServerEnum.offline
    ) {
      addLastSnackbar({
        message: translate('loadedapp.connection-error') as string,
        screenName: [screenName],
      });
      return;
    }

    navigation.navigate(RouteEnum.Computing, { sendPageStatePar });

    let error = '';
    let customError: string | undefined;

    try {
      const txid = await sendTransaction(sendPageStatePar);

      clearState();
      setScrollToTop(true);
      setScrollToBottom(true);

      createAlert(
        setBackgroundError,
        addLastSnackbar,
        [screenName, ScreenEnum.History],
        translate('send.confirm-title') as string,
        `${translate('send.Broadcast')} ${txid}`,
        true,
      );

      navigation.navigate(RouteEnum.ComputingOK, { txid });
      return;
    } catch (err) {
      report(err);
      error = err as string;
      customError = interceptCustomError(error);
    }

    navigation.navigate(RouteEnum.ComputingError, {
      error: `${customError ? customError : error}`,
    });
  };

  const setQrcodeModalShow = () => {
    navigation.navigate(RouteEnum.ScannerAddress, {
      setAddress: (a: string) => updateToField(a, null, null, null, null),
      active: true,
    });
  };

  const setConfirmModalShow = async () => {
    await confirmSend(buildSendState());
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.bgCanvas }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? 0 : kbOpen ? insets.top : 0
        }
      >
        <HeaderTitle
          title={title}
          goBack={() => {
            if (title === 'Send') {
              setStage('Send to');
            } else {
              clear();
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }
          }}
        />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: 8,
            paddingBottom: insets.bottom + 8,
            paddingHorizontal: 16,
          }}
        >
          <View style={{ flexGrow: 1, alignItems: 'center' }}>
            {title === 'Send to' && (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    width: '100%',
                    marginBottom: 5,
                  }}
                >
                  {validAddress === 1 && (
                    <View testID="send.address.check">
                      <FontAwesomeIcon
                        icon={faCheck}
                        color={colors.fgAccent}
                        style={{ marginHorizontal: 10 }}
                      />
                    </View>
                  )}
                  {validAddress === -1 && (
                    <ErrorText
                      testID="send.address.error"
                      style={{ marginHorizontal: 10 }}
                    >
                      {translate('send.invalidaddress') as string}
                    </ErrorText>
                  )}
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-start',
                    borderColor: 'transparent',
                    borderWidth: 1,
                    borderRadius: 25,
                    marginBottom: 10,
                    backgroundColor: colors.bgSurface,
                    width: '100%',
                    maxWidth: maxW,
                    minWidth: '50%',
                    minHeight: 48,
                    alignItems: 'center',
                    paddingHorizontal: 25,
                    paddingVertical: 7,
                  }}
                >
                  <TextInput
                    placeholder="Enter address"
                    placeholderTextColor={colors.fgSubtle}
                    testID="import.seedufvkinput"
                    style={{
                      flexGrow: 1,
                      flexShrink: 1,
                      color: colors.fgDefault,
                      fontWeight: '600',
                      fontSize: 16,
                      minHeight: 48,
                      marginLeft: 5,
                      backgroundColor: 'transparent',
                    }}
                    value={addressText}
                    onChangeText={(text: string) => {
                      updateToField(text, null, null, null, null);
                    }}
                    editable={true}
                    keyboardType="default"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                  {!!addressText && (
                    <TouchableOpacity
                      onPress={() => {
                        updateToField('', null, null, null, null);
                      }}
                    >
                      <View
                        style={{
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: colors.bgMuted,
                          borderRadius: 11,
                          height: 22,
                          width: 22,
                          padding: 0,
                        }}
                      >
                        <XIcon color={colors.bgCanvas} width={20} height={20} />
                      </View>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    testID="send.scan-button"
                    accessible={true}
                    accessibilityLabel={translate('send.scan-acc') as string}
                    onPress={setQrcodeModalShow}
                  >
                    <FontAwesomeIcon
                      style={{ marginLeft: 10 }}
                      size={22}
                      icon={faQrcode}
                      color={colors.fgSubtle}
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {title === 'Send' && (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    width: '100%',
                    marginBottom: 5,
                  }}
                >
                  {validAmount === -1 && (
                    <ErrorText style={{ marginHorizontal: 10 }}>
                      {translate('send.invalidnumber') as string}
                    </ErrorText>
                  )}
                  {validAmount === -2 && (
                    <ErrorText style={{ marginHorizontal: 10 }}>
                      {translate('send.invalidamount') as string}
                    </ErrorText>
                  )}
                </View>

                <View
                  style={{
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    borderColor: colors.borderFaint,
                    borderWidth: 1,
                    borderRadius: 25,
                    marginBottom: 10,
                    backgroundColor: colors.bgSurface,
                    width: '100%',
                    maxWidth: maxW,
                    minWidth: '50%',
                    minHeight: 48,
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 30,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput
                      placeholder={'0'}
                      placeholderTextColor={colors.fgSubtle}
                      style={{
                        flexGrow: 1,
                        flexShrink: 1,
                        color: colors.fgDefault,
                        fontWeight: '600',
                        fontSize: 45,
                        minHeight: 48,
                        marginLeft: 5,
                        backgroundColor: 'transparent',
                      }}
                      value={amountText}
                      onChangeText={(text: string) =>
                        updateToField(
                          null,
                          text.substring(0, 20),
                          null,
                          null,
                          null,
                        )
                      }
                      onEndEditing={(
                        e: NativeSyntheticEvent<TextInputEndEditingEventData>,
                      ) => {
                        updateToField(
                          null,
                          e.nativeEvent.text.substring(0, 20),
                          null,
                          null,
                          null,
                        );
                      }}
                      editable={true}
                      maxLength={20}
                      keyboardType="numeric"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                    />

                    <View
                      style={{
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <View
                        style={{ flexDirection: 'row', alignSelf: 'flex-end' }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            borderColor: colors.fgDefault,
                            borderWidth: 1,
                            borderRadius: 20,
                            backgroundColor: colors.bgCanvas,
                            paddingHorizontal: 10,
                            paddingVertical: 10,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Image
                            source={require('../../assets/icons/zcash.png')}
                            style={{ width: 22, height: 22 }}
                          />
                          <RegText style={{ fontSize: 15 }}>
                            {' ' +
                              (info.currencyName ? info.currencyName : '---')}
                          </RegText>
                        </View>
                      </View>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'baseline',
                          justifyContent: 'flex-end',
                          marginTop: 5,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => {
                            if (sendability.error) {
                              Alert.alert(
                                'Available',
                                sendability.error,
                                [
                                  {
                                    text: translate('cancel') as string,
                                    style: 'cancel',
                                  },
                                ],
                                { cancelable: false },
                              );
                            }
                          }}
                        >
                          <View
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              justifyContent: 'flex-start',
                              alignItems: 'center',
                              marginTop: 0,
                            }}
                          >
                            <ZecAmount
                              currencyName={info.currencyName}
                              color={
                                stillConfirming ||
                                negativeMaxAmount ||
                                !!sendability.error
                                  ? 'red'
                                  : colors.fgDefault
                              }
                              size={15}
                              amtZec={sendability.maxAmount}
                              privacy={privacy}
                              style={{ fontWeight: '900' }}
                            />
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            updateToField(
                              null,
                              Utils.parseNumberFloatToStringLocale(
                                sendability.maxAmount,
                                5,
                              ),
                              null,
                              null,
                              null,
                            );
                          }}
                        >
                          <View
                            style={{
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              borderRadius: 10,
                              margin: 0,
                              paddingHorizontal: 8,
                              paddingVertical: 5,
                              backgroundColor: colors.bgCanvas,
                            }}
                          >
                            <RegText
                              style={{ fontSize: 14 }}
                              color={colors.fgDefault}
                            >
                              {'Max.'}
                            </RegText>
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'column' }}>
                    {validAddress !== 0 &&
                      validAmount !== 0 &&
                      (fee > 0 || !!proposeSendLastError) && (
                        <View
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            marginTop: 0,
                            backgroundColor: colors.bgSurface,
                            padding: 5,
                            borderRadius: 10,
                          }}
                        >
                          <FontAwesomeIcon
                            icon={faInfoCircle}
                            size={20}
                            color={colors.fgAccent}
                            style={{ marginRight: 5 }}
                          />
                          <FadeText>{'( '}</FadeText>
                          <TouchableOpacity
                            onPress={() => {
                              if (proposeSendLastError) {
                                Alert.alert(
                                  translate('send.fee') as string,
                                  proposeSendLastError,
                                  [
                                    {
                                      text: translate('cancel') as string,
                                      style: 'cancel',
                                    },
                                  ],
                                  { cancelable: false },
                                );
                              }
                            }}
                          >
                            <FadeText
                              style={{
                                color: proposeSendLastError
                                  ? 'red'
                                  : colors.fgMuted,
                              }}
                            >
                              {(translate('send.fee') as string) +
                                ': ' +
                                Utils.parseNumberFloatToStringLocale(fee, 8) +
                                ' '}
                            </FadeText>
                          </TouchableOpacity>
                          <FadeText>{')'}</FadeText>
                        </View>
                      )}

                    {stillConfirming && (
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          marginTop: 0,
                          backgroundColor: colors.bgSurface,
                          padding: 5,
                          borderRadius: 10,
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faInfoCircle}
                          size={20}
                          color={colors.fgAccent}
                          style={{ marginRight: 5 }}
                        />
                        <FadeText style={{ fontSize: 12.5 }}>
                          {translate('send.somefunds') as string}
                        </FadeText>
                      </View>
                    )}
                  </View>
                </View>

                <View
                  style={{
                    padding: 10,
                    paddingHorizontal: 12,
                    borderColor: colors.fgDefault,
                    backgroundColor: colors.bgCanvas,
                    borderWidth: 1,
                    borderRadius: 30,
                    marginTop: -25,
                    zIndex: 999,
                  }}
                >
                  <FontAwesomeIcon
                    icon={faArrowDown}
                    size={25}
                    color={colors.fgDefault}
                  />
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    borderColor: colors.borderFaint,
                    borderWidth: 1,
                    borderRadius: 25,
                    marginBottom: 10,
                    backgroundColor: colors.bgCanvas,
                    width: '100%',
                    maxWidth: maxW,
                    minWidth: '50%',
                    minHeight: 48,
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 30,
                    gap: 10,
                    marginTop: -15,
                  }}
                >
                  <Wallet width={40} height={40} />
                  <RegText>{Utils.trimToSmall(addressText, 10)}</RegText>
                </View>
              </>
            )}
          </View>
        </ScrollView>

        <View
          style={{
            marginTop: 'auto',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 10,
            paddingBottom: 20,
            paddingHorizontal: 20,
          }}
        >
          {title === 'Send to' && (
            <LiquidPrimaryButton
              style={{
                width: '100%',
              }}
              title={'Continue'}
              disabled={!addressText || validAddress !== 1}
              onPress={() => {
                setStage('Send');
                Keyboard.dismiss();
              }}
            />
          )}

          {title === 'Send' && (
            <LiquidPrimaryButton
              style={{
                width: '100%',
              }}
              title={
                validAmount === 1 &&
                amountText &&
                Utils.parseStringLocaleToNumberFloat(amountText) ===
                  Utils.parseStringLocaleToNumberFloat(
                    sendability.maxAmount.toFixed(8),
                  )
                  ? (translate('send.button-all') as string)
                  : (translate('send.button') as string)
              }
              disabled={!sendButtonEnabled || submitting}
              onPress={async () => {
                setSubmitting(true);
                updateToField(null, null, null, memoText, null);

                if (
                  indexerServer.chainName === ChainNameEnum.mainChainName &&
                  donationAddress &&
                  Utils.parseStringLocaleToNumberFloat(amountText) <
                    Utils.parseStringLocaleToNumberFloat(
                      Utils.getZenniesDonationAmount(),
                    )
                ) {
                  addLastSnackbar({
                    message: `${translate('send.donation-minimum-message') as string}`,
                    screenName: [screenName],
                  });
                  updateToField(
                    null,
                    Utils.getZenniesDonationAmount(),
                    null,
                    null,
                    false,
                  );
                  setSubmitting(false);
                  return;
                }

                if (
                  !netInfo.isConnected ||
                  selectIndexerServer === SelectServerEnum.offline
                ) {
                  addLastSnackbar({
                    message: translate('loadedapp.connection-error') as string,
                    screenName: [screenName],
                  });
                  setSubmitting(false);
                  return;
                }

                if (
                  validAmount === 1 &&
                  amountText &&
                  Utils.parseStringLocaleToNumberFloat(amountText) ===
                    Utils.parseStringLocaleToNumberFloat(
                      sendability.maxAmount.toFixed(8),
                    )
                ) {
                  addLastSnackbar({
                    message: `${translate('send.sendall-message') as string}`,
                    screenName: [screenName],
                  });
                }

                if (!memoEnabled) {
                  setMemoText('');
                  updateToField(null, null, null, '', false);
                }

                setConfirmModalShow();
                Keyboard.dismiss();
                setSubmitting(false);
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </ToastProvider>
  );
};

export default Send;
