import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { RouteEnum } from '../../app/AppState';
import { radiusPill, space, text, useTheme } from '../../app/theme';

type StakingActionsProps = {};

const StakingActions: React.FC<StakingActionsProps> = () => {
  const navigation: any = useNavigation();
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <>
        <Pressable
          onPress={() => navigation.navigate(RouteEnum.Stake)}
          style={[styles.button, { backgroundColor: colors.bgAccentTint }]}
        >
          <Text style={[text.subheadline, { color: colors.fgAccent }]}>
            Stake
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            navigation.navigate(RouteEnum.Unstake, {
              finalizer: undefined,
              txid: undefined,
              staked: undefined,
            })
          }
          style={[styles.button, { backgroundColor: colors.bgWarningTint }]}
        >
          <Text style={[text.subheadline, { color: colors.fgWarning }]}>
            Unstake
          </Text>
        </Pressable>
      </>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: space.xl,
  },
  button: {
    paddingVertical: space.lg,
    borderRadius: radiusPill,
    alignItems: 'center',
    width: 120,
  },
});

export default StakingActions;
