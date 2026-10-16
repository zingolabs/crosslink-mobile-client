/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView } from 'react-native';

import { useNavigation } from '@react-navigation/native';

import { ContextAppLoaded } from '../../../app/context';
import { ToastProvider, useToast } from 'react-native-toastier';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FadeText from '../../Components/FadeText';
import { HeaderTitle } from '../../Header';
import { useTheme } from '../../../app/theme';

export const Notes: React.FunctionComponent = () => {
  const navigation = useNavigation();
  const context = useContext(ContextAppLoaded);
  const {} = context;
  const { colors } = useTheme();
  const { clear } = useToast();

  const insets = useSafeAreaInsets();

  return (
    <ToastProvider>
      <HeaderTitle
        title="Wallet notes"
        goBack={() => {
          clear();
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: insets.bottom + 8,
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            flexGrow: 1,
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              borderRadius: 26,
              backgroundColor: colors.bgSurface,
              width: '100%',
              marginTop: 20,
              paddingVertical: 10,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                marginVertical: 20,
                marginHorizontal: 30,
                width: '85%',
              }}
            >
              <FadeText>Under construction</FadeText>
            </View>
          </View>
        </View>
      </ScrollView>
    </ToastProvider>
  );
};
