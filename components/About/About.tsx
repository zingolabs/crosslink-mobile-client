import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';

import FadeText from '../Components/FadeText';
import { LoadedAppStackParamList } from '../../app/types';
import {
  useAppLoadedActions,
  useAppLoadedSettings,
  useAppLoadedUi,
} from '../../app/context';
import DetailLine from '../Components/DetailLine';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { RouteEnum, ScreenEnum } from '../../app/AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderTitle } from '../Header';
import { space } from '../../app/theme';

type AboutProps = NativeStackScreenProps<
  LoadedAppStackParamList,
  RouteEnum.About
>;

const About: React.FunctionComponent<AboutProps> = ({ navigation }) => {
  const { translate, removeFirstSnackbar } = useAppLoadedActions();
  const { zingolibVersion } = useAppLoadedSettings();
  const { snackbars } = useAppLoadedUi();
  const { clear } = useToast();
  const screenName = ScreenEnum.About;

  const insets = useSafeAreaInsets();

  const arrayTxtObject = translate('about.copyright');
  let arrayTxt: string[] = [];
  if (typeof arrayTxtObject === 'object') {
    arrayTxt = arrayTxtObject as string[];
  }

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <HeaderTitle
        title="About"
        goBack={() => {
          clear();
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + space.sm },
        ]}
      >
        <View style={styles.center}>
          <FadeText style={styles.paraFirst}>{arrayTxt[0]}</FadeText>
          <DetailLine
            label={'Zingo Delegator Version'}
            value={translate('version') as string}
            screenName={screenName}
          />
          <DetailLine
            label={translate('info.zingolib') as string}
            value={zingolibVersion}
            screenName={screenName}
          />
          <View style={styles.copyright}>
            {arrayTxt.map((txt: string, ind: number) => (
              <View key={txt.substring(0, 10)}>
                {ind !== 0 && <FadeText style={styles.para}>{txt}</FadeText>}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ToastProvider>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingTop: space.sm,
    paddingHorizontal: space.lg,
  },
  center: {
    flexGrow: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  paraFirst: {
    marginTop: space.xl,
  },
  copyright: {
    marginTop: space.xl,
  },
  para: {
    marginBottom: space.xl,
  },
});

export default About;
