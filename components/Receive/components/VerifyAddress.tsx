import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Keyboard } from 'react-native';

import {
  GlobalConst,
  ScreenEnum,
  SnackbarDurationEnum,
} from '../../../app/AppState';
import {
  useAppLoadedActions,
  useAppLoadedSettings,
} from '../../../app/context';
import { useToast } from 'react-native-toastier';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import RPCModule from '../../../app/RPCModule';
import { parseZcashURI } from '../../../app/uris';
import TextInputAddress from '../../Components/TextInputAddress';
import FadeText from '../../Components/FadeText';
import RegText from '../../Components/RegText';
import { RPCCheckAddressType } from '../../../app/wallet/types/RPCCheckAddressType';
import { VerifyCheckIcon } from '../../Components/Icons/VerifyCheckIcon';
import { VerifyXIcon } from '../../Components/Icons/VerifyXIcon';
import LiquidPrimaryButton from '../../Components/LiquidButton/LiquidPrimaryButton';
import { space, useTheme } from '../../../app/theme';

type VerifyAddressProps = {
  closeSheet: () => void;
  screenName: ScreenEnum;
  setHeightLayout: (h: number) => void;
};
const VerifyAddress: React.FunctionComponent<VerifyAddressProps> = ({
  closeSheet,
  screenName,
  setHeightLayout,
}) => {
  const { translate, addLastSnackbar } = useAppLoadedActions();
  const { indexerServer } = useAppLoadedSettings();
  const { colors } = useTheme();
  const { clear } = useToast();

  const [address, setAddress] = useState<string>('');
  const [errorAddress, setErrorAddress] = useState<string>('');
  const [verifyOK, setVerifyOK] = useState<boolean | null>(null);

  const verifyAddress = async () => {
    try {
      const verifyAddressStr = await RPCModule.checkMyAddressInfo(address);
      //console.log(verifyAddressStr);
      if (verifyAddressStr) {
        if (verifyAddressStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error new address ${verifyAddressStr}`);
          addLastSnackbar({
            message: verifyAddressStr,
            duration: SnackbarDurationEnum.short,
            screenName: [screenName],
          });
          setErrorAddress(verifyAddressStr);
        }
      } else {
        console.log('Internal Error new address ');
      }

      const verifyAddressJSON: RPCCheckAddressType =
        await JSON.parse(verifyAddressStr);
      setVerifyOK(verifyAddressJSON.is_wallet_address);

      //return newAddressStr;
    } catch (error) {
      console.log(`Critical Error new address ${error}`);
      //return `Error: ${error}`;
    }

    Keyboard.dismiss();
    clear();
  };

  const updateAddress = async (addr: string) => {
    if (!addr) {
      setAddress('');
      return;
    }
    // Attempt to parse as URI if it starts with zcash
    if (
      addr.toLowerCase().startsWith(GlobalConst.zcash) ||
      addr.toLowerCase().includes(':')
    ) {
      const { error, target } = await parseZcashURI(
        addr,
        translate,
        indexerServer,
      );
      //console.log(targets);

      if (target) {
        // redo the to addresses
        [target].forEach(tgt => {
          setAddress(tgt.address || '');
        });
      }
      if (error) {
        // Show the error message as a toast
        addLastSnackbar({ message: error, screenName: [screenName] });
        //return;
      }
    } else {
      setAddress(addr.replace(/[ \t\n\r]+/g, '')); // Remove spaces
    }
  };

  return (
    <View
      onLayout={e => {
        const { height } = e.nativeEvent.layout;
        //console.log('LAYOUTTT', height);
        setHeightLayout(height + 70);
      }}
      style={{ backgroundColor: colors.bgCanvas }}
    >
      <TouchableOpacity
        onPress={() => {
          setAddress('');
          Keyboard.dismiss();
          clear();
          setTimeout(() => {
            closeSheet();
          }, 100);
        }}
      >
        <FontAwesomeIcon
          size={30}
          icon={faXmark}
          color={colors.fgDefault}
          style={styles.close}
        />
      </TouchableOpacity>
      <RegText style={styles.title}>
        {translate('receive.verify') as string}
      </RegText>
      <TextInputAddress
        address={address}
        setAddress={updateAddress}
        setError={setErrorAddress}
        disabled={false}
        showLabel={false}
        screenName={screenName}
      />
      {!!errorAddress && (
        <View style={styles.row}>
          <FadeText style={{ color: colors.fgDanger }}>{errorAddress}</FadeText>
        </View>
      )}
      {verifyOK !== null && (
        <View style={styles.row}>
          {verifyOK ? (
            <View style={styles.result}>
              <VerifyCheckIcon
                color={colors.fgAccent}
                style={styles.resultIcon}
              />
              <FadeText style={{ color: colors.fgDefault }}>
                {translate('receive.verification-success') as string}
              </FadeText>
            </View>
          ) : (
            <View style={styles.result}>
              <VerifyXIcon color={colors.fgDanger} style={styles.resultIcon} />
              <FadeText style={{ color: colors.fgDefault }}>
                {translate('receive.verification-failure') as string}
              </FadeText>
            </View>
          )}
        </View>
      )}
      <View>
        <View style={styles.actions}>
          <LiquidPrimaryButton
            title={translate('verify') as string}
            onPress={() => {
              verifyAddress();
            }}
            disabled={!address || !!errorAddress}
          />
          <LiquidPrimaryButton
            tintColor={colors.bgSurface}
            title={translate('cancel') as string}
            onPress={() => {
              setAddress('');
              Keyboard.dismiss();
              clear();
              setTimeout(() => {
                closeSheet();
              }, 100);
            }}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  close: {
    marginTop: space.md,
    marginRight: space.xl,
    alignSelf: 'flex-end',
  },
  title: {
    paddingHorizontal: space.md,
    alignSelf: 'center',
  },
  row: {
    flexGrow: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: space.xs,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '90%',
  },
  resultIcon: {
    marginRight: space.md,
  },
  actions: {
    flexGrow: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: space.xs,
    marginTop: space.xxxl,
    gap: space.md,
  },
});

export default React.memo(VerifyAddress);
