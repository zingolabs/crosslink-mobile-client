/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';

import { LoadingAppNavigationState } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import { ToastProvider, useToast } from 'react-native-toastier';
import { RouteEnum } from '../../app/AppState';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faChevronRight,
  faInfo,
  faSeedling,
  faServer,
  faChevronLeft,
} from '@fortawesome/free-solid-svg-icons';
import RegText from '../Components/RegText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderTitle } from '../Header';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SettingsStackParamList } from './SettingsNavigator';
import LiquidPrimaryButton from '../Components/LiquidButton/LiquidPrimaryButton';
import { useTheme } from '../../app/theme';

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
  const context = useContext(ContextAppLoaded);
  const { translate } = context;
  const { colors } = useTheme();
  const { clear } = useToast();

  const insets = useSafeAreaInsets();

  const restoreWallet = () => {
    Alert.alert(
      'Switch to different wallet',
      'Please confirm that you want to switch to a different/another wallet and you will lose access to your current wallet.',
      [
        {
          text: translate('confirm') as string,
          onPress: () =>
            onClickOKChangeWallet({ screen: 1, startingApp: false }),
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

  return (
    <ToastProvider>
      <HeaderTitle
        title="Settings"
        goBack={() => {
          clear();
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
      />

      <View
        style={{
          flexGrow: 1,
          paddingBottom: insets.bottom + 8,
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            flexGrow: 1,
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1 }}>
              <View
                style={{
                  borderRadius: 25,
                  borderColor: colors.fgDefault,
                  borderWidth: 1,
                  padding: 10,
                  margin: 10,
                  backgroundColor: colors.bgCanvas,
                  alignSelf: 'flex-start',
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    clear();
                    if (navigation.canGoBack()) {
                      navigation.goBack();
                    }
                  }}
                >
                  <FontAwesomeIcon
                    size={30}
                    icon={faChevronLeft}
                    color={colors.fgDefault}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={{
                borderRadius: 26,
                backgroundColor: colors.bgSurface,
                width: '100%',
                marginTop: 20,
                paddingVertical: 5,
              }}
            >
              {routes.map((item, index) => (
                <React.Fragment key={item.label}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      marginVertical: 18,
                      marginHorizontal: 40,
                      width: '80%',
                    }}
                  >
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                      }}
                      onPress={() => navigation?.navigate(item.route)}
                    >
                      <View style={{ flexDirection: 'row', gap: 15 }}>
                        <FontAwesomeIcon
                          size={20}
                          icon={item.icon}
                          color={colors.fgDefault}
                        />
                        <RegText>{item.label}</RegText>
                      </View>
                      <FontAwesomeIcon
                        size={20}
                        icon={faChevronRight}
                        color={colors.fgDefault}
                      />
                    </TouchableOpacity>
                  </View>

                  {index < routes.length - 1 && (
                    <View
                      style={{ height: 1, backgroundColor: colors.bgFaint }}
                    />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        </View>
      </View>
      <View
        style={{
          marginTop: 'auto',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 10,
          paddingBottom: 20,
          paddingHorizontal: 20,
        }}
      >
        <LiquidPrimaryButton
          tintColor={colors.bgDanger}
          title={'Switch to different wallet'}
          onPress={restoreWallet}
          style={{ alignSelf: 'stretch' }}
        />
      </View>
    </ToastProvider>
  );
};

export default SettingsMenu;
