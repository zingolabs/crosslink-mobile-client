/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo, useState } from 'react';
import { View, TouchableOpacity, TextInput, Platform } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';

import RegText from '../Components/RegText';
import FadeText from '../Components/FadeText';
import { SettingsStackParamList } from '../../app/types';
import {
  useFeedback,
  useSession,
  useSettings,
  useStatus,
} from '../../app/store';
import {
  SnackbarDurationEnum,
  ScreenEnum,
  RouteEnum,
  GlobalConst,
} from '../../app/AppState';
import Utils from '../../app/utils';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderTitle } from '../Header';
import { BlurView } from '@react-native-community/blur';
import LiquidPrimaryButton from '../Components/LiquidButton/LiquidPrimaryButton';
import Animated, {
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';
import type { CSSTransitionProperties } from 'react-native-reanimated';
import { curve, duration as motionDuration, useTheme } from '../../app/theme';

type SeedProps = NativeStackScreenProps<SettingsStackParamList, RouteEnum.Seed>;

const EASE_OUT = cubicBezier(curve[0], curve[1], curve[2], curve[3]);

const Seed: React.FunctionComponent<SeedProps> = ({}) => {
  const navigation: any = useNavigation();
  const { translate, addLastSnackbar, removeFirstSnackbar } = useFeedback();
  const { getUfvk } = useSession();
  const { privacy } = useSettings();
  const { wallet } = useStatus();
  const { snackbars } = useFeedback();
  const { colors } = useTheme();
  // when this screen is open from LoadingApp (new wallet)
  // is using the standard modal from react-native
  const { clear } = useToast();
  const screenName = ScreenEnum.Seed;

  const SEED_LENGTH = 24;

  const insets = useSafeAreaInsets();

  const [birthdayShown, setBirthdayShown] = useState<boolean>(false);
  const expandBirthday = !privacy || birthdayShown;
  const [seedBlurred, setSeedBlurred] = useState<boolean>(true);
  const reducedMotion = useReducedMotion();

  const gridTransition: CSSTransitionProperties = {
    transitionProperty: ['transform'],
    transitionDuration: `${motionDuration.enter}ms`,
    transitionTimingFunction: EASE_OUT,
  };

  const veilTransition: CSSTransitionProperties = {
    transitionProperty: ['opacity'],
    transitionDuration: reducedMotion ? '120ms' : `${motionDuration.enter}ms`,
    transitionTimingFunction: EASE_OUT,
  };

  const seedPhrase = wallet.seed || '';
  const birthdayNumber = (wallet.birthday && wallet.birthday.toString()) || '';

  const [ufvk, setUfvk] = useState<string>('');

  useEffect(() => {
    const loadUfvk = async () => {
      try {
        const value = await getUfvk();
        setUfvk(value || '');
      } catch (e) {
        console.error('Failed to load ufvk', e);
        setUfvk('');
      }
    };

    loadUfvk();
  }, [getUfvk]);

  const rows = useMemo<string[][]>(() => {
    const words = seedPhrase.split(' ').slice(0, SEED_LENGTH);
    const out: string[][] = [];
    for (let i = 0; i < SEED_LENGTH; i += 3) {
      out.push(words.slice(i, i + 3));
    }
    return out;
  }, [seedPhrase]);

  const onClickCancelHide = () => {
    clear();
    hiding();
  };

  const hiding = async () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  //console.log('=================================');
  //console.log(wallet.seed, wallet.birthday);
  //console.log('render seed', privacy);

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <HeaderTitle
        title="Seed phrase"
        goBack={() => {
          onClickCancelHide();
        }}
      />

      <View
        style={{
          flex: 1,
          paddingBottom: insets.bottom + 8,
          paddingHorizontal: 10,
        }}
      >
        <View
          style={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          {rows.length > 0 && !!seedPhrase && (
            <View
              style={{
                marginTop: 10,
                position: 'relative',
                borderRadius: 20,
                overflow: 'hidden',
                padding: 8,
                rowGap: 8,
              }}
            >
              <Animated.View
                style={[
                  {
                    rowGap: 8,
                    transform: [
                      { scale: reducedMotion ? 1 : seedBlurred ? 0.98 : 1 },
                    ],
                    ...gridTransition,
                  },
                ]}
                pointerEvents={seedBlurred ? 'none' : 'auto'}
                accessibilityElementsHidden={seedBlurred}
                importantForAccessibility={
                  seedBlurred ? 'no-hide-descendants' : 'auto'
                }
              >
                {rows.map((row, rowIndex) => (
                  <View
                    key={rowIndex}
                    style={{
                      flexDirection: 'row',
                      columnGap: 8,
                      justifyContent: 'center',
                    }}
                  >
                    {row.map((word, colIndex) => {
                      const index = rowIndex * 3 + colIndex;
                      return (
                        <View
                          key={index}
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-start',
                            borderColor: colors.borderFaint,
                            borderWidth: 1,
                            borderRadius: 25,
                            backgroundColor: colors.bgSurface,
                            width: '30%',
                            minWidth: '30%',
                            alignItems: 'center',
                            paddingHorizontal: 10,
                            paddingVertical:
                              Platform.OS === GlobalConst.platformOSandroid
                                ? 0
                                : 5,
                            overflow: 'hidden',
                          }}
                        >
                          <FadeText>{`${index + 1}`}.</FadeText>
                          <TextInput
                            style={{
                              flexGrow: 1,
                              flexShrink: 1,
                              color: colors.fgDefault,
                              fontWeight: '400',
                              fontSize: 15,
                              lineHeight: 15,
                              backgroundColor: 'transparent',
                              marginTop:
                                Platform.OS === GlobalConst.platformOSandroid
                                  ? 0
                                  : 5,
                              marginLeft:
                                Platform.OS === GlobalConst.platformOSandroid
                                  ? 0
                                  : 3,
                            }}
                            value={word}
                            editable={false}
                            keyboardType="default"
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="done"
                          />
                          <Animated.View
                            style={[
                              {
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                opacity: seedBlurred ? 1 : 0,
                                ...veilTransition,
                              },
                            ]}
                            pointerEvents="none"
                          >
                            <BlurView
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                              }}
                              blurType="dark"
                              blurAmount={20}
                              reducedTransparencyFallbackColor={colors.bgCanvas}
                            />
                          </Animated.View>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </Animated.View>

              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: seedBlurred ? 1 : 0,
                    ...veilTransition,
                  },
                ]}
                pointerEvents={seedBlurred ? 'auto' : 'none'}
                accessibilityElementsHidden={!seedBlurred}
                importantForAccessibility={
                  !seedBlurred ? 'no-hide-descendants' : 'auto'
                }
              >
                <LiquidPrimaryButton
                  title="View seed phrase"
                  onPress={() => setSeedBlurred(false)}
                  tintColor="rgba(255,255,255,0.10)"
                  style={{
                    alignSelf: 'center',
                    borderRadius: 20,
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    minWidth: 0,
                  }}
                  textStyle={{ fontSize: 16 }}
                />
              </Animated.View>
            </View>
          )}

          {!seedBlurred && !!seedPhrase && (
            <TouchableOpacity
              style={{ alignSelf: 'center' }}
              onPress={() => {
                if (seedPhrase) {
                  Clipboard.setString(seedPhrase);
                  if (addLastSnackbar) {
                    addLastSnackbar({
                      message: translate('seed.tapcopy-seed-message') as string,
                      duration: SnackbarDurationEnum.short,
                      screenName: [screenName],
                    });
                  }
                }
              }}
            >
              <View
                style={{
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: 16,
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderFaint,
                  borderWidth: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  marginVertical: 10,
                }}
              >
                <RegText
                  style={{
                    color: colors.fgDefault,
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  Copy
                </RegText>
              </View>
            </TouchableOpacity>
          )}

          {!seedPhrase && (
            <FadeText
              style={{ padding: 10, textAlign: 'center', fontSize: 17 }}
            >
              {
                'The server is temporarily out of service. Please try again in a few seconds, or you may need to select a different server if this problem persists.'
              }
            </FadeText>
          )}

          {!!birthdayNumber && (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-start',
                borderColor: colors.borderFaint,
                borderWidth: 1,
                borderRadius: 25,
                marginTop: 10,
                marginBottom: 10,
                backgroundColor: colors.bgSurface,
                width: '100%',
                minWidth: '50%',
                minHeight: 48,
                alignItems: 'center',
                paddingHorizontal: 25,
                paddingVertical: 15,
              }}
            >
              <FadeText
                style={{
                  flexGrow: 1,
                  flexShrink: 1,
                  fontSize: 20,
                }}
              >
                Birthday
              </FadeText>
              <TouchableOpacity
                onPress={() => {
                  if (birthdayNumber) {
                    Clipboard.setString(birthdayNumber);
                    if (addLastSnackbar) {
                      addLastSnackbar({
                        message: translate(
                          'seed.tapcopy-birthday-message',
                        ) as string,
                        duration: SnackbarDurationEnum.short,
                        screenName: [screenName],
                      });
                    }
                    setBirthdayShown(true);
                    if (privacy) {
                      setTimeout(() => {
                        setBirthdayShown(false);
                      }, 5 * 1000);
                    }
                  }
                }}
              >
                <RegText
                  color={colors.fgDefault}
                  style={{ textAlign: 'center' }}
                >
                  {!expandBirthday
                    ? Utils.trimToSmall(birthdayNumber, 1)
                    : birthdayNumber}
                </RegText>
              </TouchableOpacity>
            </View>
          )}
          {ufvk ? (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-start',
                borderColor: colors.borderFaint,
                borderWidth: 1,
                borderRadius: 25,
                marginTop: 10,
                marginBottom: 10,
                backgroundColor: colors.bgSurface,
                width: '100%',
                minWidth: '50%',
                minHeight: 48,
                alignItems: 'center',
                paddingHorizontal: 25,
                paddingVertical: 15,
              }}
            >
              <FadeText
                style={{
                  flexGrow: 1,
                  flexShrink: 1,
                  fontSize: 20,
                }}
              >
                UFVK
              </FadeText>

              <TouchableOpacity
                onPress={() => {
                  Clipboard.setString(ufvk);
                  if (addLastSnackbar) {
                    addLastSnackbar({
                      message: 'UFVK copied',
                      duration: SnackbarDurationEnum.short,
                      screenName: [screenName],
                    });
                  }
                }}
              >
                <RegText
                  color={colors.fgDefault}
                  style={{ textAlign: 'center' }}
                >
                  {Utils.trimToSmall(ufvk, 12)}
                </RegText>
              </TouchableOpacity>
            </View>
          ) : (
            <FadeText
              style={{
                flexGrow: 1,
                flexShrink: 1,
                fontSize: 20,
                marginTop: 10,
              }}
            >
              ... extracting UFVK...
            </FadeText>
          )}
        </View>
      </View>
    </ToastProvider>
  );
};

export default Seed;
