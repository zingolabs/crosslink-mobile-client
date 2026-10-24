import React from 'react';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';

import { LaunchingModeEnum, TranslateType } from '../../AppState';
import LiquidPrimaryButton from '../../../components/Components/LiquidButton/LiquidPrimaryButton';
import { space, text, useTheme } from '../../theme';

type LaunchingProps = {
  empty: boolean;
  translate: (key: string) => TranslateType;
  firstLaunchingMessage: LaunchingModeEnum;
  biometricsFailed: boolean;
  tryAgain?: () => void;
  message?: string;
};

const Launching: React.FunctionComponent<LaunchingProps> = props => {
  const { colors } = useTheme();

  if (props.empty && !props.biometricsFailed) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bgCanvas }]} />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgCanvas }]}>
      <View style={styles.topHalf}>
        <View style={styles.titleBlock}>
          <Text style={[text.largeTitle, { color: colors.fgMuted }]}>
            {props.translate('zingodelegator') as string}
          </Text>
          <Text style={[text.subheadline, { color: colors.fgMuted }]}>
            {props.translate('version') as string}
          </Text>
        </View>
        <View style={styles.bodyBlock}>
          {!!props.message && (
            <Text
              style={[
                text.subheadline,
                { color: colors.fgAccentDisabled, marginTop: space.md },
              ]}
              selectable
            >
              {props.message}
            </Text>
          )}
          {props.biometricsFailed ? (
            <>
              <Text
                style={[
                  text.title3,
                  styles.centerText,
                  { color: colors.fgDefault, marginTop: space.md },
                ]}
                selectable
              >
                {props.translate('biometricsfailed-title') as string}
              </Text>
              <Text
                style={[
                  text.subheadline,
                  styles.centerText,
                  { color: colors.fgDefault, marginTop: space.md },
                ]}
                selectable
              >
                {props.translate('biometricsfailed-body') as string}
              </Text>
              <Text
                style={[
                  text.subheadline,
                  styles.centerText,
                  {
                    color: colors.fgDefault,
                    marginTop: space.md,
                    marginBottom: space.md,
                  },
                ]}
                selectable
              >
                {props.translate('biometricsfailed-footer') as string}
              </Text>
              <LiquidPrimaryButton
                title={props.translate('biometricsfailed-button') as string}
                onPress={() => props.tryAgain && props.tryAgain()}
                style={styles.buttonGap}
              />
            </>
          ) : (
            <>
              <ActivityIndicator
                size="large"
                color={
                  props.firstLaunchingMessage === LaunchingModeEnum.updating
                    ? colors.fgAccent
                    : 'transparent'
                }
              />
              <Text
                style={[
                  text.title3,
                  styles.centerText,
                  {
                    color: colors.fgDefault,
                    marginTop: space.md,
                    opacity:
                      props.firstLaunchingMessage ===
                        LaunchingModeEnum.updating && !props.biometricsFailed
                        ? 1
                        : 0,
                  },
                ]}
                selectable
              >
                {props.firstLaunchingMessage === LaunchingModeEnum.updating ||
                props.firstLaunchingMessage === LaunchingModeEnum.opening
                  ? (props.translate(
                      'updating.firstlaunchingmessage-title',
                    ) as string)
                  : (props.translate(
                      'installing.firstlaunchingmessage-title',
                    ) as string)}
              </Text>
              <Text
                style={[
                  text.subheadline,
                  styles.centerText,
                  {
                    color: colors.fgDefault,
                    marginTop: space.md,
                    opacity:
                      props.firstLaunchingMessage ===
                        LaunchingModeEnum.updating && !props.biometricsFailed
                        ? 1
                        : 0,
                  },
                ]}
                selectable
              >
                {props.firstLaunchingMessage === LaunchingModeEnum.updating ||
                props.firstLaunchingMessage === LaunchingModeEnum.opening
                  ? (props.translate(
                      'updating.firstlaunchingmessage-body',
                    ) as string)
                  : (props.translate(
                      'installing.firstlaunchingmessage-body',
                    ) as string)}
              </Text>
              <Text
                style={[
                  text.subheadline,
                  styles.centerText,
                  {
                    color: colors.fgDefault,
                    marginTop: space.md,
                    marginBottom: space.md,
                    opacity:
                      props.firstLaunchingMessage ===
                        LaunchingModeEnum.updating && !props.biometricsFailed
                        ? 1
                        : 0,
                  },
                ]}
                selectable
              >
                {props.firstLaunchingMessage === LaunchingModeEnum.updating ||
                props.firstLaunchingMessage === LaunchingModeEnum.opening
                  ? (props.translate(
                      'updating.firstlaunchingmessage-footer',
                    ) as string)
                  : (props.translate(
                      'installing.firstlaunchingmessage-footer',
                    ) as string)}
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topHalf: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '95%',
  },
  titleBlock: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '80%',
    height: '40%',
    marginTop: space.xl,
    padding: space.md,
  },
  bodyBlock: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '80%',
    height: '60%',
    marginTop: space.xl,
    padding: space.md,
  },
  centerText: {
    textAlign: 'center',
  },
  buttonGap: {
    marginBottom: space.md,
    marginTop: space.md,
  },
});

export default Launching;
