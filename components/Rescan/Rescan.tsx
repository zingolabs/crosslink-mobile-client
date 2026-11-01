import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';

import RegText from '../Components/RegText';
import { SessionStackParamList } from '../../app/types';
import {
  useFeedback,
  useSettings,
  useStatus,
} from '../../app/context';
import {
  RouteEnum,
  ScreenEnum,
  SelectServerEnum,
  SnackbarDurationEnum,
} from '../../app/AppState';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderTitle } from '../Header';
import LiquidPrimaryButton from '../Components/LiquidButton/LiquidPrimaryButton';
import { space } from '../../app/theme';

type RescanProps = NativeStackScreenProps<
  SessionStackParamList,
  RouteEnum.Rescan
> & {
  doRescan: () => Promise<void>;
};

const Rescan: React.FunctionComponent<RescanProps> = ({
  navigation,
  doRescan,
}) => {
  const { translate, addLastSnackbar, removeFirstSnackbar } = useFeedback();
  const { selectIndexerServer } = useSettings();
  const { wallet, netInfo } = useStatus();
  const { snackbars } = useFeedback();
  const { clear } = useToast();
  const screenName = ScreenEnum.Rescan;

  const insets = useSafeAreaInsets();

  const doRescanAndClose = async () => {
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
    // was removed the `await` here because launching the rescan can
    // take a lot of time and it's better the App responsive.
    doRescan();
    clear();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
    setTimeout(() => {
      // because this message is between screens.
      addLastSnackbar({
        message: translate('loadedapp.syncing') as string,
        duration: SnackbarDurationEnum.longer,
        screenName: [screenName, ScreenEnum.Session],
      });
    }, 3 * 1000);
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <HeaderTitle
        title="Rescan wallet"
        goBack={() => {
          clear();
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + space.sm },
        ]}
      >
        <View style={styles.center}>
          <View style={styles.text}>
            <RegText>
              {(translate('rescan.text-1') as string) +
                wallet.birthday +
                translate('rescan.text-2')}
            </RegText>
          </View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <LiquidPrimaryButton
          title={translate('rescan.button') as string}
          onPress={doRescanAndClose}
        />
      </View>
    </ToastProvider>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingTop: space.sm,
    paddingHorizontal: space.lg,
  },
  center: {
    flexGrow: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  text: {
    display: 'flex',
    margin: space.xl,
    marginBottom: space.xxxl,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: space.md,
    paddingBottom: space.xl,
  },
});

export default Rescan;
