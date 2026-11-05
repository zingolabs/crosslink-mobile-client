import React, { useEffect } from 'react';
import {
  Image,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../app/theme';
import { useLifehash } from '../../app/utils/lifehash';

const PLACEHOLDER = require('../../assets/images/default-lifehash.png');

type LifehashDiscProps = {
  finalizer: string;
  size: number;
  style?: StyleProp<ViewStyle>;
};

const GREY_OPACITY = 0.4;

const LifehashDisc: React.FC<LifehashDiscProps> = ({
  finalizer,
  size,
  style,
}) => {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const uri = useLifehash(finalizer);
  const progress = useSharedValue(0);
  const loaded = !!uri;

  useEffect(() => {
    if (!loaded) {
      return;
    }
    if (reduced) {
      progress.set(1);
      return;
    }
    progress.set(
      withTiming(1, { duration: 200, easing: Easing.bezier(0.23, 1, 0.32, 1) }),
    );
  }, [loaded, progress, reduced]);

  const imageStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
  }));

  const recoveryStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 1], [GREY_OPACITY, 0]),
  }));

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
      <Image
        source={PLACEHOLDER}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      />
      {loaded && (
        <Animated.Image
          source={{ uri }}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, imageStyle]}
        />
      )}
      {loaded && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.bgSurfaceRaised },
            recoveryStyle,
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  disc: {
    overflow: 'hidden',
  },
});

export default React.memo(LifehashDisc);
