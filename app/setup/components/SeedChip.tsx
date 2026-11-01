import React, { useEffect } from 'react';
import {
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  LinearTransition,
  ReduceMotion,
  ZoomOut,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
} from '@callstack/liquid-glass';

import { text, useTheme } from '../../theme';

type SeedChipProps = {
  index: number;
  word: string;
  invalid: boolean;
  entrance: boolean;
  editing: boolean;
  draft: string;
  disabled?: boolean;
  onPress: () => void;
  onChangeDraft: (t: string) => void;
  onSubmit: () => void;
  onBlur: () => void;
  onBackspaceEmpty: () => void;
};

const SETTLE = {
  duration: 380,
  dampingRatio: 1,
  reduceMotion: ReduceMotion.System,
};
const PRESS = {
  duration: 150,
  dampingRatio: 1,
  reduceMotion: ReduceMotion.System,
};
const SLIDE = -18;
const GLASS_TINT = 'rgba(179, 179, 179, 0.34)';
const EDIT_TINT = 'rgba(255, 255, 255, 0.5)';
const DANGER_TINT = 'rgba(125, 0, 2, 0.45)';
const NATIVE_PRESS = isLiquidGlassSupported;

const rubber = (x: number, dimension = 120, constant = 0.55): number => {
  'worklet';
  return (x * dimension * constant) / (dimension + constant * Math.abs(x));
};

const SeedChip: React.FC<SeedChipProps> = ({
  index,
  word,
  invalid,
  entrance,
  editing,
  draft,
  disabled = false,
  onPress,
  onChangeDraft,
  onSubmit,
  onBlur,
  onBackspaceEmpty,
}) => {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const animate = entrance && !reduced;
  const progress = useSharedValue(animate ? 0 : 1);
  const edit = useSharedValue(editing ? 1 : 0);
  const press = useSharedValue(1);
  const drag = useSharedValue(0);

  useEffect(() => {
    if (animate) {
      progress.set(withSpring(1, SETTLE));
    }
  }, [animate, progress]);

  useEffect(() => {
    edit.set(withSpring(editing ? 1 : 0, SETTLE));
  }, [editing, edit]);

  const tap = Gesture.Tap()
    .enabled(!editing && !disabled)
    .maxDuration(300)
    .onBegin(() => {
      if (!NATIVE_PRESS) {
        press.set(withSpring(0.97, PRESS));
      }
    })
    .onFinalize(() => {
      press.set(withSpring(1, PRESS));
    })
    .onEnd(() => {
      scheduleOnRN(onPress);
    });

  const pan = Gesture.Pan()
    .enabled(!editing && !disabled && !reduced)
    .activeOffsetX([-6, 6])
    .failOffsetY([-10, 10])
    .onUpdate(e => {
      drag.set(rubber(e.translationX));
    })
    .onFinalize(e => {
      drag.set(
        withSpring(0, {
          duration: 400,
          dampingRatio: 0.8,
          velocity: e.velocityX,
        }),
      );
    });

  const gesture = Gesture.Race(pan, tap);

  const slide = index > 0 ? SLIDE : 0;
  const shape = useAnimatedStyle(() => {
    const p = progress.get();
    const d = drag.get();
    const base =
      interpolate(p, [0, 1], [0.86, 1]) * (1 + 0.04 * edit.get()) * press.get();
    const stretch = Math.abs(d) / 400;
    return {
      transform: [
        { translateX: interpolate(p, [0, 1], [slide, 0]) + d * 0.3 },
        { scaleX: base * (1 + stretch) },
        { scaleY: base * (1 - stretch * 0.5) },
      ],
    };
  });

  const tint = editing ? EDIT_TINT : invalid ? DANGER_TINT : GLASS_TINT;

  const content = editing ? (
    <View style={styles.row}>
      <Text style={styles.ghost}>{draft || 'a'}</Text>
      <TextInput
        value={draft}
        onChangeText={onChangeDraft}
        onSubmitEditing={onSubmit}
        selectionColor={colors.fgMuted}
        onBlur={onBlur}
        onKeyPress={(e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
          if (e.nativeEvent.key === 'Backspace' && !draft) {
            onBackspaceEmpty();
          }
        }}
        submitBehavior="blurAndSubmit"
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
        keyboardType={
          Platform.OS === 'android' ? 'visible-password' : 'default'
        }
        returnKeyType="done"
        editable={!disabled}
        style={[styles.word, styles.input, { color: colors.fgDefault }]}
        accessibilityLabel={`Word ${index + 1}`}
      />
    </View>
  ) : (
    <View style={styles.row}>
      <Text
        style={[
          styles.word,
          { color: colors.fgDefault },
          invalid && { color: colors.fgDanger },
        ]}
      >
        {word}
      </Text>
    </View>
  );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={shape}
        layout={LinearTransition.duration(250).reduceMotion(
          ReduceMotion.System,
        )}
        exiting={ZoomOut.duration(150).reduceMotion(ReduceMotion.System)}
        accessible={!editing}
        accessibilityRole={editing ? undefined : 'button'}
        accessibilityLabel={
          editing
            ? undefined
            : `Word ${index + 1}, ${word}${invalid ? ', not in the word list' : ''}`
        }
        accessibilityHint={editing ? undefined : 'Edits this word'}
      >
        {isLiquidGlassSupported ? (
          <LiquidGlassView
            effect="regular"
            colorScheme="system"
            interactive={!disabled}
            tintColor={tint}
            style={styles.chip}
          >
            {content}
          </LiquidGlassView>
        ) : (
          <View
            style={[
              styles.chip,
              styles.fallback,
              editing && { borderColor: colors.borderMuted },
              invalid && !editing && { borderColor: colors.borderDanger },
            ]}
          >
            {content}
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  chip: {
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
  },
  row: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    height: 34,
  },
  fallback: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  word: {
    ...text.body,
    fontWeight: '500',
  },
  ghost: {
    ...text.body,
    fontWeight: '500',
    opacity: 0,
  },
  input: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
});

export default SeedChip;
