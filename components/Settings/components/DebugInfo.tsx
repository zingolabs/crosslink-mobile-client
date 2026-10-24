import React from 'react';
import { StyleSheet, ScrollView, Text, View } from 'react-native';

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
import { createAlert } from '../../../app/createAlert';
import { sendEmail } from '../../../app/sendEmail';
import { HeaderTitle } from '../../Header';
import LiquidPrimaryButton from '../../Components/LiquidButton/LiquidPrimaryButton';
import { mono, radiusCard, space, useTheme } from '../../../app/theme';

type DebugInfoProps = NativeStackScreenProps<
  LoadedAppStackParamList,
  RouteEnum.DebugInfo
>;

/** Last error, presented as a terminal: mono text on a dark panel. */
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
        <View style={[styles.terminal, { backgroundColor: colors.bgChrome }]}>
          <Text style={[styles.line, { color: colors.fgFaint }]}>
            $ debug --last-error
          </Text>
          {lastError ? (
            <Text selectable style={[styles.line, { color: colors.fgDefault }]}>
              {lastError}
            </Text>
          ) : (
            <Text style={[styles.line, { color: colors.fgMuted }]}>
              no errors detected
            </Text>
          )}
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
  terminal: {
    borderRadius: radiusCard,
    width: '100%',
    marginTop: space.xl,
    padding: space.xl,
    minHeight: 220,
  },
  line: {
    ...mono,
    lineHeight: 22,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: space.sm,
  },
});

export default DebugInfo;
