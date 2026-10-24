import React from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Utils from '../../../app/utils';
import {
  radiusCard,
  radiusPill,
  space,
  text,
  useTheme,
} from '../../../app/theme';

type FinalizerCardProps = {
  lifehash: string;
  finalizerId: string;
  userStake: number;
  totalStake: number;

  containerStyle?: StyleProp<ViewStyle>;
  headerRowStyle?: StyleProp<ViewStyle>;
  avatarStyle?: StyleProp<ImageStyle>;
  titleStyle?: StyleProp<TextStyle>;
  statsRowStyle?: StyleProp<ViewStyle>;
  statCardStyle?: StyleProp<ViewStyle>;
  statTitleStyle?: StyleProp<TextStyle>;
  statValueRowStyle?: StyleProp<ViewStyle>;
  statIconStyle?: StyleProp<TextStyle>;
  statValueStyle?: StyleProp<TextStyle>;
};

function formatStake(value: number) {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} cTAZ`;
}

export function FinalizerCard({
  lifehash,
  finalizerId,
  userStake,
  totalStake,
  containerStyle,
  headerRowStyle,
  avatarStyle,
  titleStyle,
  statsRowStyle,
  statCardStyle,
  statTitleStyle,
  statValueRowStyle,
  statIconStyle,
  statValueStyle,
}: FinalizerCardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bgSurface },
        containerStyle,
      ]}
    >
      <View style={[styles.headerRow, headerRowStyle]}>
        <Image
          source={{ uri: lifehash }}
          style={[
            styles.avatar,
            { backgroundColor: colors.bgFaint },
            avatarStyle,
          ]}
          resizeMode="cover"
        />

        <Text
          numberOfLines={1}
          style={[
            text.title3,
            styles.title,
            { color: colors.fgDefault },
            titleStyle,
          ]}
        >
          {Utils.trimToSmall(finalizerId, 8)}
        </Text>
      </View>

      <View style={[styles.statsRow, statsRowStyle]}>
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.bgFaint },
            statCardStyle,
          ]}
        >
          <Text
            style={[
              text.headline,
              styles.statTitle,
              { color: colors.fgDefault },
              statTitleStyle,
            ]}
          >
            Your stake
          </Text>

          <View style={[styles.statValueRow, statValueRowStyle]}>
            <Text
              style={[
                text.headline,
                styles.statIcon,
                { color: colors.fgSubtle },
                statIconStyle,
              ]}
            >
              ⛁
            </Text>
            <Text
              style={[text.callout, { color: colors.fgSubtle }, statValueStyle]}
            >
              {formatStake(userStake)}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.bgFaint },
            statCardStyle,
          ]}
        >
          <Text
            style={[
              text.headline,
              styles.statTitle,
              { color: colors.fgDefault },
              statTitleStyle,
            ]}
          >
            Total staked
          </Text>

          <View style={[styles.statValueRow, statValueRowStyle]}>
            <Text
              style={[
                text.headline,
                styles.statIcon,
                { color: colors.fgSubtle },
                statIconStyle,
              ]}
            >
              ₴
            </Text>
            <Text
              style={[text.callout, { color: colors.fgSubtle }, statValueStyle]}
            >
              {formatStake(totalStake)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radiusCard,
    paddingHorizontal: space.xl,
    paddingVertical: space.xl,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.xl,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: radiusPill,
    marginRight: 22,
  },

  title: {
    flex: 1,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.sm,
  },

  statCard: {
    flex: 1,
    borderRadius: radiusCard,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statTitle: {
    marginBottom: space.xs,
  },

  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  statIcon: {
    width: 30,
    textAlign: 'center',
  },
});
