/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef, useState } from 'react';

import { useAppLoadedActions, useAppLoadedUi } from '../../../app/context';
import Scanner from '../../Scanner';
import { GlobalConst, RouteEnum, ScreenEnum } from '../../../app/AppState';
import { LoadedAppStackParamList } from '../../../app/types';

import { View } from 'react-native';
import Snackbars from '../../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HeaderTitle } from '../../Header';
import { useTheme } from '../../../app/theme';

type ScannerAddressProps = NativeStackScreenProps<
  LoadedAppStackParamList,
  RouteEnum.ScannerAddress
>;

const ScannerAddress: React.FunctionComponent<ScannerAddressProps> = ({
  navigation,
  route,
}) => {
  const setAddress =
    !!route.params && route.params.setAddress !== undefined
      ? route.params.setAddress
      : () => {};
  const { removeFirstSnackbar } = useAppLoadedActions();
  const { snackbars } = useAppLoadedUi();
  const { colors } = useTheme();
  const { clear } = useToast();
  const screenName = ScreenEnum.ScannerAddress;

  const goBackExecutedAlready = useRef<boolean>(false);

  const [active, setActive] = useState<boolean>(
    !!route.params && route.params.active !== undefined
      ? route.params.active
      : false,
  );

  useEffect(() => {
    const _active =
      !!route.params && route.params.active !== undefined
        ? route.params.active
        : false;
    setActive(_active);
  }, [route, route.params, route.params?.active]);

  const validateAddress = (scannedAddress: string) => {
    if (scannedAddress.toLowerCase().startsWith(GlobalConst.zcash)) {
      //console.log('valid QR URI');
      setAddress(scannedAddress);
    } else {
      //console.log('not valid QR URI, adding prefix zcash:');
      if (scannedAddress.toLowerCase().includes(':')) {
        setAddress(scannedAddress);
      } else {
        setAddress(GlobalConst.zcash + scannedAddress);
      }
    }
  };

  const onRead = async (scandata: string) => {
    if (!scandata) {
      return;
    }
    validateAddress(scandata);
  };

  const onCloseScreen = () => {
    clear();
    setActive(false);
    // in iOS this is execute twice
    // ...avoiding that...
    if (navigation.canGoBack() && !goBackExecutedAlready.current) {
      goBackExecutedAlready.current = true;
      navigation.goBack();
      //console.log('GOOOOOOOOOOO BACK');
    }
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <HeaderTitle title="Scan zcash address" goBack={() => onCloseScreen()} />

      <View
        style={{
          flex: 1,
          backgroundColor: colors.bgCanvas,
          marginTop: 15,
        }}
      >
        <Scanner
          active={active}
          onRead={onRead}
          onClose={() => onCloseScreen()}
        />
      </View>
    </ToastProvider>
  );
};

export default ScannerAddress;
