/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import SettingsIcon from '../../../assets/icons/settings.svg';
import ChartPieIcon from '../../../assets/icons/chart-pie.svg';

import { RouteEnum, ScreenEnum } from '../../../app/AppState';
import { useTheme } from '../../../app/theme';

type SettingsButtonProps = {
  screenName: ScreenEnum;
};

const SettingsButton: React.FC<SettingsButtonProps> = ({ screenName }) => {
  const navigation: any = useNavigation();
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: 50,
        paddingHorizontal: 20,
        gap: 10,
      }}
    >
      {screenName === ScreenEnum.StakingHome && (
        <TouchableOpacity
          testID="header.finalizers"
          onPress={() => {
            navigation.navigate(RouteEnum.Distribution);
          }}
        >
          <ChartPieIcon height={30} width={30} color={colors.fgDefault} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        testID="header.settings"
        onPress={() => {
          navigation.navigate(RouteEnum.SettingsStack);
        }}
      >
        <SettingsIcon height={30} width={30} color={colors.fgDefault} />
      </TouchableOpacity>
    </View>
  );
};

export default SettingsButton;
