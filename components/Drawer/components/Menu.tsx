/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, Text, Dimensions } from 'react-native';

import RegText from '../../../components/Components/RegText';

import { ContextAppLoaded } from '../../../app/context';
import simpleBiometrics from '../../../app/simpleBiometrics';
import {
  MenuItemEnum,
  ScreenEnum,
  SelectServerEnum,
} from '../../../app/AppState';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useTheme } from '../../../app/theme';

type MenuProps = {
  onItemSelected: (item: MenuItemEnum) => void;
  screenName: ScreenEnum;
  toggleMenuDrawer: () => void;
};

const Menu: React.FunctionComponent<MenuProps> = ({
  onItemSelected,
  screenName,
  toggleMenuDrawer,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    readOnly,
    valueTransfersTotal,
    addLastSnackbar,
    security,
    rescanMenu,
    selectIndexerServer,
    netInfo,
  } = context;
  const { colors } = useTheme();

  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  const item = {
    fontSize: 14,
    // for small screens -> trying to avoid the scroll.
    paddingTop: dimensions.height < 475 ? 20 : 25,
  };

  const onItemSelectedWrapper = async (value: MenuItemEnum) => {
    toggleMenuDrawer();
    if (
      (value === MenuItemEnum.WalletSeedUfvk && security.seedUfvkScreen) ||
      (value === MenuItemEnum.Rescan && security.rescanScreen) ||
      (value === MenuItemEnum.ChangeWallet && security.changeWalletScreen) ||
      (value === MenuItemEnum.RestoreWalletBackup &&
        security.restoreWalletBackupScreen)
    ) {
      const resultBio = await simpleBiometrics({ translate: translate });
      // can be:
      // - true      -> the user do pass the authentication
      // - false     -> the user do NOT pass the authentication
      // - undefined -> no biometric authentication available -> Passcode.
      //console.log('BIOMETRIC --------> ', resultBio);
      if (resultBio === false) {
        // snack with Error & closing the menu.
        addLastSnackbar({
          message: translate('biometrics-error') as string,
          screenName: [screenName],
        });
      } else {
        // the App/Drawer needs a bit of time to close
        // properly
        onItemSelected(value);
      }
    } else {
      // the App/Drawer needs a bit of time to close
      // properly
      onItemSelected(value);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgChrome,
        alignItems: 'stretch',
      }}
    >
      <DrawerContentScrollView
        scrollsToTop={false}
        style={{
          backgroundColor: colors.bgChrome,
        }}
      >
        <RegText
          color={colors.fgMuted}
          style={{ marginVertical: 10, marginLeft: 30 }}
        >
          {translate('loadedapp.options') as string}
        </RegText>
        <View style={{ height: 1, backgroundColor: colors.bgAccent }} />

        <View style={{ display: 'flex', marginLeft: 20 }}>
          <RegText
            testID="menu.about"
            onPress={() => onItemSelectedWrapper(MenuItemEnum.About)}
            style={item}
          >
            {translate('loadedapp.about') as string}
          </RegText>
          <RegText
            testID="menu.settings"
            onPress={() => onItemSelectedWrapper(MenuItemEnum.Settings)}
            style={item}
          >
            {translate('loadedapp.settings') as string}
          </RegText>
          {selectIndexerServer !== SelectServerEnum.offline && (
            <RegText
              testID="menu.info"
              onPress={() => onItemSelectedWrapper(MenuItemEnum.Info)}
              style={item}
            >
              {translate('loadedapp.info') as string}
            </RegText>
          )}
          {!(valueTransfersTotal !== null && valueTransfersTotal === 0) &&
            false && (
              <RegText
                testID="menu.walletseedufvk"
                onPress={() =>
                  onItemSelectedWrapper(MenuItemEnum.WalletSeedUfvk)
                }
                style={item}
              >
                {readOnly
                  ? (translate('loadedapp.walletufvk') as string)
                  : (translate('loadedapp.walletseed') as string)}
              </RegText>
            )}
          {rescanMenu && selectIndexerServer !== SelectServerEnum.offline && (
            <RegText
              testID="menu.rescan"
              onPress={() => onItemSelectedWrapper(MenuItemEnum.Rescan)}
              style={item}
            >
              {translate('loadedapp.rescanwallet') as string}
            </RegText>
          )}
          {selectIndexerServer !== SelectServerEnum.offline && false && (
            <RegText
              testID="menu.syncreport"
              onPress={() => onItemSelectedWrapper(MenuItemEnum.SyncReport)}
              style={item}
            >
              {translate('loadedapp.report') as string}
            </RegText>
          )}
          <RegText
            testID="menu.fundpools"
            onPress={() => onItemSelectedWrapper(MenuItemEnum.FundPools)}
            style={item}
          >
            {translate('loadedapp.fundpools') as string}
          </RegText>
          {netInfo.isConnected &&
            selectIndexerServer !== SelectServerEnum.offline && (
              <RegText
                testID="menu.changewallet"
                onPress={() => onItemSelectedWrapper(MenuItemEnum.ChangeWallet)}
                style={item}
              >
                {translate('loadedapp.changewallet') as string}
              </RegText>
            )}
          {!readOnly &&
            selectIndexerServer !== SelectServerEnum.offline &&
            false && (
              <RegText
                testID="menu.votefornym"
                onPress={() => onItemSelectedWrapper(MenuItemEnum.VoteForNym)}
                style={item}
              >
                {translate('loadedapp.votefornym') as string}
              </RegText>
            )}
          <RegText
            onPress={() => onItemSelectedWrapper(MenuItemEnum.Support)}
            style={item}
          >
            {translate('loadedapp.support') as string}
          </RegText>
        </View>
      </DrawerContentScrollView>
      <View
        style={{
          padding: 10,
          position: 'absolute',
          bottom: 5,
          flexDirection: 'row',
          backgroundColor: colors.bgChrome,
        }}
      >
        <Text style={{ fontSize: 8, color: colors.fgFaint }}>Version : </Text>
        <Text style={{ fontSize: 8, color: colors.fgAccentDisabled }}>
          {translate('version') as string}
        </Text>
      </View>
    </View>
  );
};

export default Menu;
