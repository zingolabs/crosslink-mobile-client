/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  LayoutChangeEvent,
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
import { useTheme } from '../../theme';
import { useBackdropSetter } from '../../Backdrop';

type StartMenuProps = {
  actionButtonsDisabled: boolean;
  walletExists: boolean;
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
        style={{
          flex: 1,
          backgroundColor: setBackdrop ? 'transparent' : colors.bgCanvas,
        }}
        onLayout={onRootLayout}
      >
        {!setBackdrop && background}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        >
          <View
            style={{
              height: 48,
              marginTop: 10,
              paddingHorizontal: 16,
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
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
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingBottom: 12,
          }}
          onLayout={e => setActionsHeight(e.nativeEvent.layout.height)}
        >
          {walletExists && (
            <>
              <View
                style={{
                  borderColor: colors.borderAccent,
                  borderWidth: 1,
                  borderRadius: 5,
                  padding: 5,
                  marginBottom: 20,
                }}
              >
                <BoldText
                  style={{ fontSize: 15, color: colors.fgAccentDisabled }}
                >
                  {translate('loadingapp.noopenwallet-message') as string}
                </BoldText>
              </View>
              <Button
                title={translate('loadingapp.opencurrentwallet') as string}
                disabled={actionButtonsDisabled}
                onPress={() => openCurrentWallet()}
                style={{ marginBottom: 20 }}
              />
            </>
          )}

          <Animated.View style={[{ marginBottom: 8 }, enterSecondary]}>
            <Button
              testID="loadingapp.restorewallet"
              variant="ghost"
              title={'Import wallet'}
              disabled={actionButtonsDisabled}
              onPress={() => getwalletToRestore()}
            />
          </Animated.View>

          <View style={{ width: '100%' }}>
            <Animated.View style={enter}>
              <Animated.View style={glass}>
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
                  style={{ width: '100%' }}
                />
              </Animated.View>
            </Animated.View>
          </View>
        </View>
      </View>
    </ToastProvider>
  );
};

export default StartMenu;
