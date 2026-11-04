import React from 'react';

import { SessionStackParamList } from '../../app/types';
import { useFeedback } from '../../app/store';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { RouteEnum, ScreenEnum } from '../../app/AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HeaderTitle } from '../Header';

type FaucetProps = NativeStackScreenProps<
  SessionStackParamList,
  RouteEnum.Faucet
>;

const Faucet: React.FunctionComponent<FaucetProps> = ({ navigation }) => {
  const { removeFirstSnackbar } = useFeedback();
  const { snackbars } = useFeedback();
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
