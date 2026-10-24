import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';

import { LoadedAppStackParamList } from '../../../app/types';
import {
  useAppLoadedActions,
  useAppLoadedSettings,
  useAppLoadedWallet,
  useAppLoadedUi,
} from '../../../app/context';
import Snackbars from '../../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { RouteEnum, ScreenEnum } from '../../../app/AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FadeText from '../../Components/FadeText';
import { createAlert } from '../../../app/createAlert';
import { sendEmail } from '../../../app/sendEmail';
import { HeaderTitle } from '../../Header';
import LiquidPrimaryButton from '../../Components/LiquidButton/LiquidPrimaryButton';
import { radiusCard, space, useTheme } from '../../../app/theme';

type DebugInfoProps = NativeStackScreenProps<
  LoadedAppStackParamList,
  RouteEnum.DebugInfo
>;

const DebugInfo: React.FunctionComponent<DebugInfoProps> = ({ navigation }) => {
  const {
    removeFirstSnackbar,
    setBackgroundError,
    addLastSnackbar,
    translate,
  } = useAppLoadedActions();
  const { zingolibVersion } = useAppLoadedSettings();
  const { lastError } = useAppLoadedWallet();
  const { snackbars } = useAppLoadedUi();
  const { colors } = useTheme();
  const { clear } = useToast();
  const screenName = ScreenEnum.DebugInfo;

  const insets = useSafeAreaInsets();

  const reportError = (error: string) => {
    createAlert(
      setBackgroundError,
      addLastSnackbar,
      [screenName],
      'Last Error',
      error,
      false,
      translate,
      sendEmail,
      zingolibVersion,
    );
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <HeaderTitle
        title="Debug info"
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
          styles.screen,
          { paddingBottom: insets.bottom + space.sm },
        ]}
      >
        <View style={[styles.card, { backgroundColor: colors.bgSurface }]}>
          <View style={styles.row}>
            <FadeText>{lastError ? lastError : 'No errors detected'}</FadeText>
          </View>
        </View>
      </ScrollView>
      <View
        style={[styles.footer, { paddingBottom: insets.bottom + space.xl }]}
      >
        {!!lastError && (
          <LiquidPrimaryButton
            title={'Report'}
            onPress={() => {
              reportError(lastError);
            }}
          />
        )}
      </View>
    </ToastProvider>
  );
};

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
  },
  card: {
    borderRadius: radiusCard,
    width: '100%',
    marginTop: space.xl,
    paddingVertical: space.sm,
  },
  row: {
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: space.sm,
  },
});

export default DebugInfo;
