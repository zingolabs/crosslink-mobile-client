import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';

import { ToastProvider, useToast } from 'react-native-toastier';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FadeText from '../../Components/FadeText';
import { HeaderTitle } from '../../Header';
import { radiusCard, space, useTheme } from '../../../app/theme';

export const Notes: React.FunctionComponent = () => {
  const navigation = useNavigation();

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
        contentContainerStyle={[
          styles.screen,
          { paddingBottom: insets.bottom + space.sm },
        ]}
      >
        <View style={[styles.card, { backgroundColor: colors.bgSurface }]}>
          <View style={styles.row}>
            <FadeText>Under construction</FadeText>
          </View>
        </View>
      </ScrollView>
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
});

export default Notes;
