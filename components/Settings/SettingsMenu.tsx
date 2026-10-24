import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  CSSTransitionProperties,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';

import { LoadingAppNavigationState } from '../../app/types';
import { useAppLoadedActions } from '../../app/context';
import { ToastProvider, useToast } from 'react-native-toastier';
import { LoadingAppEntryEnum, RouteEnum } from '../../app/AppState';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faChevronRight,
  faInfo,
  faSeedling,
  faServer,
} from '@fortawesome/free-solid-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderTitle } from '../Header';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SettingsStackParamList } from './SettingsNavigator';
import LiquidPrimaryButton from '../Components/LiquidButton/LiquidPrimaryButton';
import {
  curve,
  duration,
  radiusCard,
  space,
  text,
  useTheme,
} from '../../app/theme';

const EASE_OUT = cubicBezier(curve[0], curve[1], curve[2], curve[3]);

/** Menu rows share the list-row rhythm. */
const ROW_HEIGHT = 60;

type SettingsMenuProps = NativeStackScreenProps<
  SettingsStackParamList,
  RouteEnum.SettingsMenu
> & {
  onClickOKChangeWallet: (state: LoadingAppNavigationState) => Promise<void>;
};

const SettingsMenu: React.FunctionComponent<SettingsMenuProps> = ({
  onClickOKChangeWallet,
  navigation,
}) => {
  const { translate } = useAppLoadedActions();
  const { colors } = useTheme();
  const { clear } = useToast();
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState<string | null>(null);

  const insets = useSafeAreaInsets();

  const goBack = () => {
    clear();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const restoreWallet = () => {
    Alert.alert(
      'Switch to different wallet',
      'Please confirm that you want to switch to a different/another wallet and you will lose access to your current wallet.',
      [
        {
          text: translate('confirm') as string,
          onPress: () =>
            onClickOKChangeWallet({
              entry: LoadingAppEntryEnum.menu,
              startingApp: false,
            }),
        },
        { text: translate('cancel') as string, style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  type SettingsRouteItem = {
    label: string;
    icon: IconProp;
    route:
      | RouteEnum.Seed
      | RouteEnum.SettingsServers
      | RouteEnum.DebugInfo
      | RouteEnum.Notes;
  };

  const routes: SettingsRouteItem[] = [
    {
      label: 'Seed Phrase',
      icon: faSeedling,
      route: RouteEnum.Seed,
    },
    {
      label: 'Server',
      icon: faServer,
      route: RouteEnum.SettingsServers,
    },
    {
      label: 'Debug Information',
      icon: faInfo,
      route: RouteEnum.DebugInfo,
    },
    {
      label: 'Notes',
      icon: faInfo,
      route: RouteEnum.Notes,
    },
  ];

  const press: CSSTransitionProperties = {
    transitionProperty: ['backgroundColor'],
    transitionDuration: reduced ? '0ms' : `${duration.press}ms`,
    transitionTimingFunction: EASE_OUT,
  };

  return (
    <ToastProvider>
      <HeaderTitle title="Settings" goBack={goBack} />

      <View
        style={[styles.screen, { paddingBottom: insets.bottom + space.sm }]}
      >
        <View style={[styles.card, { backgroundColor: colors.bgSurface }]}>
          {routes.map((item, index) => (
            <React.Fragment key={item.label}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.label}
                onPress={() => navigation?.navigate(item.route)}
                onPressIn={() => setPressed(item.label)}
                onPressOut={() => setPressed(null)}
                pressRetentionOffset={space.lg}
              >
                <Animated.View
                  style={[
                    styles.row,
                    pressed === item.label
                      ? { backgroundColor: colors.bgPress }
                      : styles.rowIdle,
                    press,
                  ]}
                >
                  <View style={styles.label}>
                    <FontAwesomeIcon
                      size={20}
                      icon={item.icon}
                      color={colors.fgDefault}
                    />
                    <Text style={[text.body, { color: colors.fgDefault }]}>
                      {item.label}
                    </Text>
                  </View>
                  <FontAwesomeIcon
                    size={16}
                    icon={faChevronRight}
                    color={colors.fgSubtle}
                  />
                </Animated.View>
              </Pressable>
              {index < routes.length - 1 && (
                <View
                  style={[
                    styles.hairline,
                    { backgroundColor: colors.borderFaint },
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>
      <View
        style={[styles.footer, { paddingBottom: insets.bottom + space.xl }]}
      >
        <LiquidPrimaryButton
          tintColor={colors.bgDanger}
          title={'Switch to different wallet'}
          onPress={restoreWallet}
          style={styles.footerButton}
        />
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
    marginTop: space.xl,
    paddingVertical: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: ROW_HEIGHT,
    paddingHorizontal: space.xl,
  },
  rowIdle: {
    backgroundColor: 'transparent',
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: space.xl,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: space.sm,
    paddingHorizontal: space.xl,
  },
  footerButton: {
    alignSelf: 'stretch',
  },
});

export default SettingsMenu;
