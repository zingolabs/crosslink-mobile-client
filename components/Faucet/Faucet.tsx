import React from 'react';

import { LoadedAppStackParamList } from '../../app/types';
import { useAppLoadedActions, useAppLoadedUi } from '../../app/context';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { RouteEnum, ScreenEnum } from '../../app/AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HeaderTitle } from '../Header';

type FaucetProps = NativeStackScreenProps<
  LoadedAppStackParamList,
  RouteEnum.Faucet
>;

const Faucet: React.FunctionComponent<FaucetProps> = ({ navigation }) => {
  const { removeFirstSnackbar } = useAppLoadedActions();
  const { snackbars } = useAppLoadedUi();
  const { clear } = useToast();
  const screenName = ScreenEnum.About;

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <HeaderTitle
        title="Faucet"
        goBack={() => {
          clear();
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
      />
    </ToastProvider>
  );
};

export default Faucet;
