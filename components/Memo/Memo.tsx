import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  Dimensions,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TextInputEndEditingEventData,
  NativeSyntheticEvent,
} from 'react-native';

import { LoadedAppStackParamList } from '../../app/types';
import {
  useAppLoadedActions,
  useAppLoadedWallet,
  useAppLoadedUi,
} from '../../app/context';
import { Header } from '../Header';
import { GlobalConst, RouteEnum, ScreenEnum } from '../../app/AppState';
import FadeText from '../Components/FadeText';
import Utils from '../../app/utils';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { XIcon } from '../Components/Icons/XIcon';
import LiquidPrimaryButton from '../Components/LiquidButton/LiquidPrimaryButton';
import { space, text, useTheme } from '../../app/theme';

type MemoProps = NativeStackScreenProps<
  LoadedAppStackParamList,
  RouteEnum.Memo
>;

const Memo: React.FunctionComponent<MemoProps> = ({ navigation, route }) => {
  const setMessage =
    !!route.params && route.params.setMessage !== undefined
      ? route.params.setMessage
      : () => {};
  const { translate, removeFirstSnackbar } = useAppLoadedActions();
  const { defaultUnifiedAddress } = useAppLoadedWallet();
  const { snackbars } = useAppLoadedUi();
  const { colors } = useTheme();
  const { clear } = useToast();
  const screenName = ScreenEnum.Memo;

  const [memo, setMemo] = useState<string>(
    !!route.params && route.params.message !== undefined
      ? route.params.message
      : '',
  );
  const [includeUAMessage, setIncludeUAMessage] = useState<boolean>(
    !!route.params && route.params.includeUAMessage !== undefined
      ? route.params.includeUAMessage
      : false,
  );

  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  useEffect(() => {
    const _message =
      !!route.params && route.params.message !== undefined
        ? route.params.message
        : '';
    const _includeUAMessage =
      !!route.params && route.params.includeUAMessage !== undefined
        ? route.params.includeUAMessage
        : false;
    setMemo(_message);
    setIncludeUAMessage(_includeUAMessage);
  }, [
    route,
    route.params,
    route.params?.includeUAMessage,
    route.params?.message,
  ]);

  const doSaveAndClose = () => {
    setMessage(memo);
    clear();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
    Keyboard.dismiss();
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <KeyboardAvoidingView
        behavior={
          Platform.OS === GlobalConst.platformOSios ? 'padding' : 'height'
        }
        keyboardVerticalOffset={
          Platform.OS === GlobalConst.platformOSios ? 10 : 0
        }
        style={[styles.kbView, { backgroundColor: colors.bgCanvas }]}
      >
        <View style={[styles.inner, { backgroundColor: colors.bgCanvas }]}>
          <Header
            title={translate('send.memo') as string}
            screenName={screenName}
            noBalance={true}
            noSyncingStatus={true}
            noDrawMenu={true}
            noPrivacy={true}
            noUfvkIcon={true}
            closeScreen={() => {
              clear();
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}
          />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            <View
              accessible={true}
              accessibilityLabel={translate('send.memo-acc') as string}
              style={[
                styles.memoBox,
                {
                  borderColor: colors.fgDefault,
                  maxHeight: dimensions.height * 0.4,
                },
              ]}
            >
              <TextInput
                testID="send.memo-field"
                multiline
                style={[
                  styles.memoInput,
                  text.caption,
                  { color: colors.fgDefault },
                ]}
                value={memo}
                onChangeText={(value: string) => setMemo(value)}
                onEndEditing={(
                  e: NativeSyntheticEvent<TextInputEndEditingEventData>,
                ) => setMemo(e.nativeEvent.text)}
                maxLength={GlobalConst.memoMaxLength}
              />
              {!!memo && (
                <TouchableOpacity
                  onPress={() => {
                    setMemo('');
                  }}
                >
                  <XIcon color={colors.bgCanvas} width={20} height={20} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.counterRow}>
              <FadeText
                style={{
                  ...text.headline,
                  color:
                    Utils.countMemoBytes(
                      memo,
                      includeUAMessage,
                      defaultUnifiedAddress,
                    ) > GlobalConst.memoMaxLength
                      ? colors.fgDanger
                      : colors.fgDefault,
                }}
              >{`${Utils.countMemoBytes(memo, includeUAMessage, defaultUnifiedAddress)} `}</FadeText>
              <FadeText>{translate('loadedapp.of') as string}</FadeText>
              <FadeText>
                {' ' + GlobalConst.memoMaxLength.toString() + ' '}
              </FadeText>
            </View>
          </ScrollView>
          <View style={styles.saveRow}>
            <LiquidPrimaryButton
              title={translate('save') as string}
              onPress={doSaveAndClose}
              disabled={
                Utils.countMemoBytes(
                  memo,
                  includeUAMessage,
                  defaultUnifiedAddress,
                ) > GlobalConst.memoMaxLength
              }
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ToastProvider>
  );
};

const styles = StyleSheet.create({
  kbView: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  scroll: {
    height: '80%',
    maxHeight: '80%',
    minHeight: '50%',
  },
  scrollContent: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    padding: space.xl,
  },
  memoBox: {
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 5,
    minWidth: 48,
    minHeight: 48,
    flexDirection: 'row',
  },
  memoInput: {
    flex: 1,
    minWidth: 48,
    minHeight: 48,
    margin: space.xs,
    backgroundColor: 'transparent',
    textAlignVertical: 'top',
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  saveRow: {
    flexGrow: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: space.sm,
  },
});

export default Memo;
