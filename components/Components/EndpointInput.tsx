import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  CSSTransitionProperties,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

import { radiusPill, text, useTheme } from '../../app/theme';
import { normalizeEndpoint, parseEndpoint } from '../../app/utils/endpoint';

type EndpointInputProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  placeholderPort?: string;
  error?: boolean;
  editable?: boolean;
  testID?: string;
};

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

const EndpointInput: React.FC<EndpointInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholderPort = '',
  error = false,
  editable = true,
  testID,
}) => {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const endpoint = parseEndpoint(value);

  const surface: CSSTransitionProperties = {
    transitionProperty: ['backgroundColor', 'borderColor'],
    transitionDuration: reducedMotion ? '0ms' : '150ms',
    transitionTimingFunction: EASE_OUT,
  };

  const clearFade: CSSTransitionProperties = {
    transitionProperty: ['opacity', 'transform'],
    transitionDuration: reducedMotion ? '0ms' : '150ms',
    transitionTimingFunction: EASE_OUT,
  };

  const showClear = value.length > 0 && editable;

  return (
    <Animated.View
      style={[
        styles.field,
        {
          backgroundColor: focused ? colors.bgSurfaceRaised : colors.bgSurface,
        },
        error ? { borderColor: colors.borderDanger } : styles.borderNone,
        surface,
      ]}
    >
      <View pointerEvents="none" style={styles.overlay}>
        {value.length === 0 ? (
          <Text style={[styles.token, { color: colors.fgFaint }]}>
            {placeholderPort ? `host:${placeholderPort}` : 'host:port'}
          </Text>
        ) : (
          <Text style={styles.token} numberOfLines={1}>
            {endpoint.scheme ? (
              <Text style={{ color: colors.fgFaint }}>
                {endpoint.scheme}://
              </Text>
            ) : null}
            <Text style={{ color: colors.fgDefault }}>{endpoint.host}</Text>
            {value.includes(':') ? (
              <Text style={{ color: colors.fgSubtle }}>:</Text>
            ) : null}
            <Text style={{ color: colors.fgAccent }}>{endpoint.port}</Text>
            <Text style={{ color: colors.fgFaint }}>{endpoint.rest}</Text>
          </Text>
        )}
      </View>

      <TextInput
        ref={inputRef}
        testID={testID}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          const clean = normalizeEndpoint(value);
          if (clean !== value) {
            onChange(clean);
          }
        }}
        onSubmitEditing={onSubmit}
        editable={editable}
        style={[styles.input, styles.invisibleText]}
        selectionColor={colors.fgAccent}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="go"
        maxLength={120}
        accessibilityLabel="Indexer address and port"
      />

      <Animated.View
        pointerEvents={showClear ? 'auto' : 'none'}
        style={[
          styles.clearWrap,
          clearFade,
          showClear ? styles.clearOn : styles.clearOff,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear"
          hitSlop={8}
          onPress={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          style={[styles.clear, { backgroundColor: colors.bgMuted }]}
        >
          <FontAwesomeIcon icon={faXmark} size={11} color={colors.bgCanvas} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  field: {
    height: 52,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    paddingLeft: 16,
    paddingRight: 44,
  },
  borderNone: {
    borderColor: 'transparent',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingLeft: 16,
    paddingRight: 44,
  },
  token: {
    ...text.body,
    fontVariant: ['tabular-nums'],
  },
  input: {
    ...text.body,
    paddingVertical: 0,
    fontVariant: ['tabular-nums'],
  },
  invisibleText: {
    color: 'transparent',
  },
  clearWrap: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  clearOn: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  clearOff: {
    opacity: 0,
    transform: [{ scale: 0.8 }],
  },
  clear: {
    width: 20,
    height: 20,
    borderRadius: radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default EndpointInput;
