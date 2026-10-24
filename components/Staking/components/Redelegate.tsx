/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  FlatList,
  Alert,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faArrowDown,
  faCheckCircle,
  faCircle,
} from '@fortawesome/free-solid-svg-icons';
import LiquidPrimaryButton from '../../Components/LiquidButton/LiquidPrimaryButton';
import {
  RouteEnum,
  ScheduledActionType,
  StakingActionKindEnum,
  WalletBondsType,
} from '../../../app/AppState';
import { LoadedAppStackParamList } from '../../../app/types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppLoadedSettings, useAppLoadedWallet } from '../../../app/context';
import { HeaderTitle } from '../../Header';
import { ChevronDown } from '../../Components/Icons/Chevron';
import FadeText from '../../Components/FadeText';
import Refresh from '../../../assets/icons/refresh.svg';
import RegText from '../../Components/RegText';
import { WalletBondsStatusEnum } from '../../../app/AppState/enums/WalletBondsStatusEnum';
import ZecAmount from '../../Components/ZecAmount';
import { ChevronRight } from 'lucide-react-native';
import { useTheme, text, space } from '../../../app/theme';

type ModalState = 'idle' | 'sending' | 'success';

type RedelegateProps = NativeStackScreenProps<
  LoadedAppStackParamList,
  RouteEnum.Redelegate
>;

const Redelegate: React.FC<RedelegateProps> = ({ route }) => {
  const finalizer =
    !!route.params && route.params.finalizer !== undefined
      ? route.params.finalizer
      : '';
  const txid =
    !!route.params && route.params.txid !== undefined ? route.params.txid : '';
  const stakedFrom =
    !!route.params && route.params.staked !== undefined
      ? route.params.staked
      : 0;

  const navigation: any = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [finalizerFromText, setFinalizerFromText] = useState<string>(finalizer);
  const [txidFrom, setTxidFrom] = useState<string>(txid);
  const [stakedFromNumber, setStakedFromNumber] = useState<number>(stakedFrom);
  const [finalizerToText, setFinalizerToText] = useState<string>('');
  const [stakedToNumber, setStakedToNumber] = useState<number>(0);

  const [selectedTxid, setSelectedTxid] = useState<string>('');
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [kbOpen, setKbOpen] = useState(false);

  const modalVisible = modalState !== 'idle';

  const { privacy } = useAppLoadedSettings();
  const { walletBonds, valueTransfers, staked, globalStaked, info } =
    useAppLoadedWallet();

  const movements = useMemo(() => {
    return walletBonds
      .filter(b => {
        // only active bonds.
        if (
          b.status === WalletBondsStatusEnum.Withdrawn ||
          b.status === WalletBondsStatusEnum.Unbonding
        )
          return false;
        if (!!txidFrom && b.txid === txidFrom) return true;
        if (txidFrom) return false;
        if (!!finalizerFromText && b.finalizer === finalizerFromText)
          return true;
        // no finalizer selected, all bonds visible. Impossible case for now.
        if (!finalizerFromText) return true;
        return false;
      })
      .sort((a, b) => b.amount - a.amount);
  }, [finalizerFromText, txidFrom, walletBonds]);

  const selectedBond = movements.find(tx => tx.txid === selectedTxid);
  const hasSelectedTx = !!selectedBond;
  const hasFinalizerFrom = !!finalizerFromText;
  const hasFinalizerTo =
    !!finalizerToText && finalizerToText !== finalizerFromText;
  // selected a tx & selected a 'to' finalizer & different finalizers
  const isValidForm = hasSelectedTx && hasFinalizerFrom && hasFinalizerTo;

  useEffect(() => {
    const s1 = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true));
    const s2 = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

  useEffect(() => {
    if (
      !!finalizerFromText &&
      !!finalizerToText &&
      finalizerFromText === finalizerToText
    ) {
      setFinalizerToText('');
      setStakedToNumber(0);
    }
  }, [finalizerFromText, finalizerToText]);

  useEffect(() => {
    // looking for the voting power of the finalizer
    if (staked.filter(g => g.finalizer === finalizerFromText).length === 1) {
      setStakedFromNumber(
        staked.filter(g => g.finalizer === finalizerFromText)[0].votingPower,
      );
    } else {
      setStakedFromNumber(0);
    }
  }, [finalizerFromText, staked]);

  useEffect(() => {
    // looking for the voting power of the finalizer
    if (
      globalStaked.filter(g => g.finalizer === finalizerToText).length === 1
    ) {
      setStakedToNumber(
        globalStaked.filter(g => g.finalizer === finalizerToText)[0]
          .votingPower,
      );
    } else {
      setStakedToNumber(0);
    }
  }, [finalizerToText, globalStaked]);

  const shortenTxid = (_txid: string) => {
    if (_txid.length <= 16) {
      return _txid;
    }
    return `${_txid.slice(0, 10)}…${_txid.slice(-8)}`;
  };

  const handleRedelegatePress = async () => {
    if (!isValidForm || !selectedBond) return;

    const selectedKind = selectedBond.status;

    const bondTxid = selectedBond.txid;
    if (!bondTxid) {
      Alert.alert('Error', 'Could not determine the original bond txid.');
      return;
    }

    if (valueTransfers?.filter(v => v.txid === bondTxid).length === 0) {
      Alert.alert(
        'Error',
        'Could not determine the original bond txid as a existent Transaction.',
      );
      return;
    } else {
      const confirmations =
        valueTransfers?.filter(v => v.txid === bondTxid)[0].confirmations || 0;
      if (confirmations <= 0) {
        Alert.alert(
          'Error',
          'This bond is still processing, wait for confirmations.',
        );
        return;
      }
    }

    console.log('bondTxid', bondTxid);

    let bondKey = selectedBond.pubKey;
    console.log('selectedKind', selectedKind);

    if (selectedKind === WalletBondsStatusEnum.Active) {
      // confirm screen
      const item: ScheduledActionType = {
        id: 0,
        kind: StakingActionKindEnum.Move,
        amount:
          (valueTransfers?.filter(v => v.txid === bondTxid)[0].amount || 0) *
          10 ** 8,
        finalizer: finalizerFromText,
        finalizerTo: finalizerToText,
        txid: bondTxid,
        bondKey: bondKey,
      };
      navigation.navigate(RouteEnum.ScheduledActionDetail, {
        item,
      });
    } else {
      Alert.alert(
        'Error',
        `Unsupported selection kind: ${selectedKind ?? 'none'}`,
      );
      setModalState('idle');
      return;
    }
  };

  const actionVerb = useMemo(() => {
    return 'Redelegate';
  }, []);

  const handleViewMovements = () => {
    setModalState('idle');
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const renderSeparator = () => <View style={{ height: space.sm }} />;

  const renderStakedTxItem = ({ item }: { item: WalletBondsType }) => {
    console.log('item', item);
    const isSelected = item.txid === selectedTxid;

    let confirmations =
      valueTransfers &&
      valueTransfers.filter(v => v.txid === item.txid).length > 0
        ? valueTransfers.filter(v => v.txid === item.txid)[0].confirmations
        : 0;

    return (
      <Pressable
        onPress={() => {
          setSelectedTxid(item.txid);
        }}
        style={[
          styles.txRow,
          {
            borderColor: isSelected ? colors.borderAccent : colors.borderFaint,
            backgroundColor: isSelected ? colors.bgSurface : colors.bgCanvas,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {!confirmations && (
              <Refresh width={15} height={15} style={{ marginRight: 5 }} />
            )}
            <Text
              style={[text.caption, { color: colors.fgDefault }]}
              numberOfLines={1}
            >
              {item.status === WalletBondsStatusEnum.Unbonding
                ? 'Inactive'
                : item.status}
            </Text>
          </View>
          <Text
            style={[text.caption2, { color: colors.fgSubtle, marginTop: 2 }]}
          >
            {shortenTxid(item.pubKey)}
          </Text>
        </View>
        <ZecAmount
          style={{
            alignSelf: 'center',
            marginLeft: space.md,
          }}
          size={14}
          currencyName={info.currencyName}
          color={colors.fgDefault}
          amtZec={item.amount}
          privacy={privacy}
        />
      </Pressable>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={{
          flex: 1,
          backgroundColor: colors.bgCanvas,
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? 0 : kbOpen ? insets.top : 0
        }
      >
        <HeaderTitle
          title="Redelegate"
          goBack={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
        />

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: 20,
            marginBottom: 10,
            padding: space.lg,
            marginHorizontal: 10,
            marginTop: space.xl,
            borderWidth: 0.5,
            borderColor: colors.borderFaint,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              flexGrow: 1,
              flexShrink: 1,
            }}
          >
            <FontAwesomeIcon
              style={{ marginRight: 15 }}
              size={20}
              icon={faCircle}
              color={colors.fgAccent}
            />
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'flex-start',
                flexGrow: 1,
                flexShrink: 1,
                gap: 0,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  style={[
                    text.body,
                    {
                      flexGrow: 1,
                      flexShrink: 1,
                      color: colors.fgDefault,
                    },
                  ]}
                  placeholder="Tap here for finalizer address"
                  placeholderTextColor={colors.fgSubtle}
                  value={shortenTxid(finalizerFromText)}
                  editable={false}
                  onChangeText={setFinalizerFromText}
                />
                {!!finalizerFromText && false && (
                  <TouchableOpacity
                    style={{ marginLeft: 5 }}
                    onPress={() => {
                      setFinalizerFromText('');
                      setStakedFromNumber(0);
                      setTxidFrom('');
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
                      <RegText
                        style={{ color: colors.bgCanvas, marginTop: -3 }}
                      >
                        x
                      </RegText>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
              {!!stakedFromNumber && (
                <FadeText
                  style={{ marginBottom: 5 }}
                >{`Staked: ${stakedFromNumber.toFixed(5)} ${info.currencyName}`}</FadeText>
              )}
            </View>
          </View>
          {false && (
            <ChevronDown
              onPress={() =>
                navigation.navigate(RouteEnum.Finalizers, {
                  setFinalizer: (f: string, s: number) => {
                    setFinalizerFromText(f);
                    setStakedFromNumber(s);
                    setTxidFrom('');
                  },
                  scope: 'my',
                  exclude: '',
                })
              }
              width={30}
              height={30}
              style={{ marginLeft: 5 }}
              color={colors.fgDefault}
            />
          )}
        </View>

        <View>
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
              width: 50,
              alignSelf: 'center',
            }}
          >
            <FontAwesomeIcon
              icon={faArrowDown}
              size={25}
              color={colors.fgDefault}
            />
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: 20,
            marginBottom: 10,
            backgroundColor: colors.bgSurface,

            padding: space.lg,
            marginHorizontal: 10,
            borderWidth: 0.5,
            borderColor: colors.borderFaint,
            marginTop: -15,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              flexGrow: 1,
              flexShrink: 1,
            }}
          >
            <FontAwesomeIcon
              style={{ marginRight: 15 }}
              size={20}
              icon={faCircle}
              color={colors.fgWarning}
            />
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'flex-start',
                flexGrow: 1,
                flexShrink: 1,
                gap: 0,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  style={[
                    text.body,
                    {
                      flexGrow: 1,
                      flexShrink: 1,
                      color: colors.fgDefault,
                    },
                  ]}
                  placeholder="Tap here for finalizer address"
                  placeholderTextColor={colors.fgSubtle}
                  value={finalizerToText}
                  editable={true}
                  onChangeText={setFinalizerToText}
                />
                {!!finalizerToText && (
                  <TouchableOpacity
                    style={{ marginLeft: 5 }}
                    onPress={() => {
                      setFinalizerToText('');
                      setStakedToNumber(0);
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
                      <RegText
                        style={{ color: colors.bgCanvas, marginTop: -3 }}
                      >
                        x
                      </RegText>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
              {!!stakedToNumber && (
                <FadeText
                  style={{ marginLeft: 15, marginBottom: 5 }}
                >{`Voting power: ${stakedToNumber.toFixed(5)} ${info.currencyName}`}</FadeText>
              )}
            </View>
          </View>
          <ChevronRight
            onPress={() =>
              navigation.navigate(RouteEnum.Finalizers, {
                setFinalizer: (f: string, s: number) => {
                  setFinalizerToText(f);
                  setStakedToNumber(s);
                },
                scope: 'network',
                exclude: finalizerFromText,
              })
            }
            width={30}
            height={30}
            style={{ marginLeft: 5 }}
            color={colors.fgDefault}
          />
        </View>

        {/* Content */}
        <View
          style={{
            flex: 1,
            paddingHorizontal: space.xxl,
            paddingTop: space.xxl,
          }}
        >
          {/* Staked TX list */}
          <Text
            style={[
              text.headline,
              { color: colors.fgDefault, marginBottom: space.sm },
            ]}
          >
            Bonds
          </Text>

          <Text
            style={[
              text.caption1,
              { color: colors.fgSubtle, marginBottom: space.sm },
            ]}
          >
            Select the original staking transaction. The redelegate amount will
            be the value from that transaction.
          </Text>

          <View
            style={{
              flex: 1,
              marginBottom: space.lg,
            }}
          >
            <FlatList
              data={movements}
              keyExtractor={item => item.txid}
              renderItem={renderStakedTxItem}
              ItemSeparatorComponent={renderSeparator}
              ListEmptyComponent={
                <Text
                  style={[
                    text.footnote,
                    {
                      color: colors.fgSubtle,
                      textAlign: 'center',
                      marginTop: space.lg,
                    },
                  ]}
                >
                  You don&apos;t have any delegation bonds active.
                </Text>
              }
            />
          </View>
        </View>

        {/* Bottom CTA */}
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 10,
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: space.xxl,
          }}
        >
          <LiquidPrimaryButton
            title={actionVerb}
            disabled={!isValidForm || modalState === 'sending'}
            onPress={handleRedelegatePress}
            style={{ alignSelf: 'stretch' }}
          />
        </View>

        {/* Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (modalState === 'success') {
              setModalState('idle');
            }
          }}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.bgCanvas,
                  borderColor: colors.borderFaint,
                },
              ]}
            >
              {modalState === 'sending' && (
                <>
                  <ActivityIndicator size="large" color={colors.fgDefault} />
                  <Text
                    style={[
                      text.callout,
                      {
                        marginTop: space.lg,
                        color: colors.fgDefault,
                        textAlign: 'center',
                      },
                    ]}
                  >
                    Sending redelegate transaction…
                  </Text>
                </>
              )}

              {modalState === 'success' && (
                <>
                  <FontAwesomeIcon
                    icon={faCheckCircle}
                    size={40}
                    color={colors.fgAccent}
                  />
                  <Text
                    style={[
                      text.headline,
                      {
                        marginTop: space.lg,
                        color: colors.fgDefault,
                        textAlign: 'center',
                      },
                    ]}
                  >
                    Redelegate request transaction sent!
                  </Text>

                  <View
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingTop: space.xxl,
                      paddingBottom: space.xl,
                      paddingHorizontal: space.xxl,
                    }}
                  >
                    <LiquidPrimaryButton
                      title="View movements"
                      onPress={handleViewMovements}
                    />
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '80%',
    maxWidth: 320,
    borderRadius: 18,
    paddingHorizontal: space.xl,
    paddingVertical: space.xxl,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: 10,
  },
});

export default Redelegate;
