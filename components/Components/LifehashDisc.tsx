import React, { useState } from 'react';
import {
  Image,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { duration, useTheme } from '../../app/theme';
import {
  lifehashCached,
  lifehashDefaultDataUrl,
  useLifehash,
} from '../../app/utils/lifehash';

type LifehashDiscProps = {
  finalizer: string;
  size: number;
  style?: StyleProp<ViewStyle>;
};

const LifehashDisc: React.FC<LifehashDiscProps> = ({
  finalizer,
  size,
  style,
}) => {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const uri = useLifehash(finalizer);
  const [late] = useState(() => !!finalizer && !lifehashCached(finalizer));
  const placeholder = finalizer ? lifehashDefaultDataUrl() : null;

  return (
    <View
      style={[
        styles.disc,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.bgSurface,
        },
        style,
      ]}
    >
      {!!placeholder && !uri && (
        <Image
          source={{ uri: placeholder }}
          resizeMode="cover"
          blurRadius={Math.ceil(size / 3)}
          style={styles.placeholder}
        />
      )}
      {!!uri && (
        <Animated.Image
          entering={
            late && !reduced ? FadeIn.duration(duration.press) : undefined
          }
          source={{ uri }}
          resizeMode="cover"
          style={{ width: size, height: size }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  disc: {
    overflow: 'hidden',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ scale: 1.15 }],
  },
});

export default React.memo(LifehashDisc);
