import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  SnackbarDurationEnum,
  SnackbarType,
  ScreenEnum,
} from '../../app/AppState';
import { useToast } from 'react-native-toastier';
import { radiusPill, space, text, useTheme } from '../../app/theme';
import type { ThemeColors } from '../../app/theme';

type SnackbarProps = {
  snackbars: SnackbarType[];
  removeFirstSnackbar: (s: ScreenEnum) => void;
  screenName: ScreenEnum;
};

// short  - 1 sec
// long   - 4 sec
// longer - 8 sec
const durationToMs = (duration: SnackbarDurationEnum | undefined): number => {
  switch (duration) {
    case SnackbarDurationEnum.short:
      return 1000;
    case SnackbarDurationEnum.longer:
      return 8000;
    default:
      return 4000;
  }
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    // toastier shrink-wraps the pill and centers it; keep it compact
    content: {
      backgroundColor: colors.bgSurfaceRaised,
      borderColor: colors.borderFaint,
      borderWidth: 1,
      borderRadius: radiusPill,
      // keeps the pill above the tab bar
      marginBottom: 100,
      paddingLeft: space.lg,
      paddingRight: space.sm,
      paddingVertical: space.sm,
    },
    textContainer: {
      flex: 0,
      padding: 0,
      margin: 0,
    },
    message: {
      ...text.footnote,
      color: colors.fgDefault,
      padding: 0,
      margin: 0,
    },
    close: {
      justifyContent: 'center',
      paddingLeft: space.md,
      paddingVertical: space.sm,
    },
    closeText: {
      ...text.footnote,
      fontWeight: '600',
      color: colors.fgMuted,
    },
  });

const Snackbars: React.FunctionComponent<SnackbarProps> = ({
  snackbars,
  removeFirstSnackbar,
  screenName,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const snacking = useRef<boolean>(false);
  const snackingMessage = useRef<string>(undefined);
  const [duration, setDuration] = useState<number>(4000);
  const toast = useToast();

  const snackbarsFiltered = useMemo(
    () =>
      snackbars.filter((s: SnackbarType) => s.screenName.includes(screenName)),
    [snackbars, screenName],
  );

  const handleSnackbarClose = useCallback(() => {
    if (snackbarsFiltered[0]?.message !== snackingMessage.current) {
      return;
    }
    // we need some time between messages
    setTimeout(() => {
      snacking.current = false;
      snackingMessage.current = undefined;
      removeFirstSnackbar(screenName);
      setDuration(4000);
    }, 0);
  }, [removeFirstSnackbar, screenName, snackbarsFiltered]);

  useEffect(() => {
    if (snackbarsFiltered.length === 0 || snacking.current) {
      return;
    }
    const currentSnackbar = snackbarsFiltered[0];
    snacking.current = true;
    snackingMessage.current = currentSnackbar.message;
    const ms = durationToMs(currentSnackbar.duration);
    setDuration(ms);
    toast.show({
      message: currentSnackbar.message,
      animation: 'zoomIn',
      duration: ms,
      right: (
        <Pressable onPress={() => toast.clear()} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      ),
      textContainerStyle: styles.textContainer,
      messageStyle: styles.message,
      contentContainerStyle: styles.content,
    });
  }, [snackbarsFiltered, toast, styles]);

  useEffect(() => {
    if (snackbarsFiltered.length > 0 && snacking.current) {
      // we do not know if the message was properly shown
      // closing after duration, just in case.
      const timer = setTimeout(() => {
        handleSnackbarClose();
      }, duration + 500);
      return () => clearTimeout(timer);
    }
  }, [
    duration,
    handleSnackbarClose,
    snackbarsFiltered,
    snackbarsFiltered.length,
  ]);

  return <View />;
};

export default Snackbars;
