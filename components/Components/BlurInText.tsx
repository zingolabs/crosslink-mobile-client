import React from 'react';
import {
  StyleProp,
  StyleSheet,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  CSSAnimationProperties,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';

type BlurInTextProps = Omit<TextProps, 'style' | 'children'> & {
  children: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  blur?: number;
  duration?: number;
};

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

const BlurInText: React.FC<BlurInTextProps> = ({
  children,
  style,
  containerStyle,
  blur = 6,
  duration = 350,
  ...props
}) => {
  const reducedMotion = useReducedMotion();
  const ms = reducedMotion ? 0 : duration;
  const color = StyleSheet.flatten(style)?.color ?? '#ffffff';

  const sharpIn: CSSAnimationProperties = {
    animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
    animationDuration: ms,
    animationTimingFunction: EASE_OUT,
  };

  const blurredOut: CSSAnimationProperties = {
    animationName: { from: { opacity: 1 }, to: { opacity: 0 } },
    animationDuration: ms,
    animationTimingFunction: EASE_OUT,
  };

  return (
    <View key={children} style={containerStyle}>
      <Animated.Text {...props} style={[style, styles.sharp, sharpIn]}>
        {children}
      </Animated.Text>
      {!reducedMotion && (
        <Animated.Text
          {...props}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[
            style,
            styles.blurred,
            { textShadowColor: color, textShadowRadius: blur },
            blurredOut,
          ]}
        >
          {children}
        </Animated.Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sharp: {
    opacity: 1,
  },
  blurred: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    color: 'transparent',
    textShadowOffset: { width: 0, height: 0 },
  },
});

export default BlurInText;
