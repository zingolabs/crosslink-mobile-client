import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  LayoutChangeEvent,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { ScreenEnum } from '../../AppState';
import { ContextAppLoading } from '../../context';
import BoldText from '../../../components/Components/BoldText';
import { ToastProvider, useToast } from 'react-native-toastier';
import Snackbars from '../../../components/Components/Snackbars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { faNetworkWired } from '@fortawesome/free-solid-svg-icons';
import { HeaderIconButton } from '../../../components/Header';
import LiquidPrimaryButton from '../../../components/Components/LiquidButton/LiquidPrimaryButton';
import Button from '../../../components/Components/Button';
import ChalkBackground from '../../../components/Chalk/ChalkBackground';
import { useChalkIntro } from '../../../components/Chalk/useChalkIntro';
import { space, text, useTheme } from '../../theme';
import { useBackdropSetter } from '../../Backdrop';

type StartMenuProps = {
  actionButtonsDisabled: boolean;
  walletExists: boolean;
  openWalletFailed?: boolean;
  playIntro: boolean;
  openCurrentWallet: () => void;
  createNewWallet: () => void;
  getwalletToRestore: () => void;
  openServers: () => void;
};

const OFFSCREEN = 4000;

const StartMenu: React.FunctionComponent<StartMenuProps> = ({
  actionButtonsDisabled,
  walletExists,
  openWalletFailed = false,
  playIntro,
  openCurrentWallet,
  createNewWallet,
  getwalletToRestore,
  openServers,
}) => {
  const context = useContext(ContextAppLoading);
  const { translate, snackbars, removeFirstSnackbar } = context;
  const { colors } = useTheme();
  const { clear } = useToast();
  const screenName = ScreenEnum.StartMenu;
  const insets = useSafeAreaInsets();

  const rootRef = useRef<View>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [bottomGap, setBottomGap] = useState(0);
  const win = useWindowDimensions();
  const setBackdrop = useBackdropSetter();
  const [actionsHeight, setActionsHeight] = useState(0);
  const reveal = useChalkIntro(size.width > 0, !playIntro);
  const enter = useAnimatedStyle(() => ({
    transform: [{ scale: 0.95 + 0.05 * reveal.ui.value }],
  }));
  const glass = useAnimatedStyle(() => ({
    transform: [{ translateX: reveal.ui.value > 0 ? 0 : -OFFSCREEN }],
  }));
  const enterSecondary = useAnimatedStyle(() => ({
    opacity: reveal.secondary.value,
    transform: [{ scale: 0.95 + 0.05 * reveal.secondary.value }],
  }));

  const onRootLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
    rootRef.current?.measureInWindow((_x, y, _w, h) =>
      setBottomGap(Math.max(0, Dimensions.get('window').height - y - h)),
    );
  };

  const background = useMemo(
    () => (
      <ChalkBackground
        width={setBackdrop ? win.width : size.width}
        height={setBackdrop ? win.height : size.height}
        actionsHeight={actionsHeight + (setBackdrop ? bottomGap : 0)}
        reveal={reveal}
      />
    ),
    [
      setBackdrop,
      win.width,
      win.height,
      size.width,
      size.height,
      actionsHeight,
      bottomGap,
      reveal,
    ],
  );

  useEffect(() => {
    setBackdrop?.(background);
  }, [setBackdrop, background]);

  useEffect(() => () => setBackdrop?.(null), [setBackdrop]);

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <View
        ref={rootRef}
        style={[
          styles.root,
          { backgroundColor: setBackdrop ? 'transparent' : colors.bgCanvas },
        ]}
        onLayout={onRootLayout}
      >
        {!setBackdrop && background}

        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View
            style={[styles.headerRow, { marginTop: insets.top + space.md }]}
          >
            <Animated.View style={enter}>
              <Animated.View style={glass}>
                <HeaderIconButton
                  icon={faNetworkWired}
                  disabled={actionButtonsDisabled}
                  onPress={() => {
                    clear();
                    openServers();
                  }}
                  accessibilityLabel="Change indexer"
                  accessibilityHint="Choose the network and indexer this wallet uses"
                />
              </Animated.View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>

        <View
          style={[styles.actions, { paddingBottom: insets.bottom + space.md }]}
          onLayout={e => setActionsHeight(e.nativeEvent.layout.height)}
        >
          {walletExists && (
            <>
              {openWalletFailed && (
                <View
                  style={[
                    styles.failedBox,
                    { borderColor: colors.borderAccent },
                  ]}
                >
                  <BoldText
                    style={{
                      ...text.subheadline,
                      color: colors.fgAccentDisabled,
                    }}
                  >
                    {translate('loadingapp.noopenwallet-message') as string}
                  </BoldText>
                </View>
              )}
              <Button
                title={translate('loadingapp.opencurrentwallet') as string}
                disabled={actionButtonsDisabled}
                onPress={() => openCurrentWallet()}
                style={styles.gapBottom}
              />
            </>
          )}

          <Animated.View style={[styles.gapSm, enterSecondary]}>
            <Button
              testID="loadingapp.restorewallet"
              variant="ghost"
              title={'Import wallet'}
              disabled={actionButtonsDisabled}
              onPress={() => getwalletToRestore()}
            />
          </Animated.View>

          <View style={[styles.fill, styles.stretch]}>
            <Animated.View style={[enter, styles.stretch]}>
              <Animated.View style={[glass, styles.stretch]}>
                <LiquidPrimaryButton
                  title={'Create new wallet'}
                  disabled={actionButtonsDisabled}
                  onPress={() => {
                    if (walletExists) {
                      Alert.alert(
                        translate('loadingapp.alert-newwallet-title') as string,
                        translate('loadingapp.alert-newwallet-body') as string,
                        [
                          {
                            text: translate('confirm') as string,
                            onPress: () => createNewWallet(),
                          },
                          {
                            text: translate('cancel') as string,
                            style: 'cancel',
                          },
                        ],
                        { cancelable: false },
                      );
                    } else {
                      createNewWallet();
                    }
                  }}
                  style={styles.fullWidth}
                />
              </Animated.View>
            </Animated.View>
          </View>
        </View>
      </View>
    </ToastProvider>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  stretch: {
    alignSelf: 'stretch',
  },
  headerRow: {
    height: 48,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: space.xl,
  },
  failedBox: {
    borderWidth: 1,
    borderRadius: 5,
    padding: space.xs,
    marginBottom: space.xl,
  },
  gapBottom: {
    marginBottom: space.xl,
  },
  gapSm: {
    marginBottom: space.sm,
  },
  fullWidth: {
    width: '100%',
  },
});

export default StartMenu;
