import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';

import Clipboard from '@react-native-clipboard/clipboard';

import RegText from '../../../components/Components/RegText';
import FadeText from '../../../components/Components/FadeText';
import { useFeedback, useSettings, useStatus } from '../../store';
import { SnackbarDurationEnum, ScreenEnum } from '../../AppState';
import { Header } from '../../../components/Header';
import Utils from '../../utils';
import Snackbars from '../../../components/Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import LiquidPrimaryButton from '../../../components/Components/LiquidButton/LiquidPrimaryButton';
import { space, useTheme } from '../../theme';

type TextsType = {
  new: string[];
  change: string[];
  server: string[];
  view: string[];
  restore: string[];
  backup: string[];
};

type NewSeedProps = {
  onClickOK: () => void;
};
const NewSeed: React.FunctionComponent<NewSeedProps> = ({ onClickOK }) => {
  const { wallet, netInfo } = useStatus();
  const { translate, setPrivacyOption, addLastSnackbar, removeFirstSnackbar } =
    useFeedback();
  const { privacy } = useSettings();
  const { snackbars } = useFeedback();
  const { colors } = useTheme();
  const { clear } = useToast();
  const screenName = ScreenEnum.Seed;

  const [seedShown, setSeedShown] = useState<boolean>(false);
  const [birthdayShown, setBirthdayShown] = useState<boolean>(false);
  const expandSeed = !privacy || seedShown;
  const expandBirthday = !privacy || birthdayShown;

  const seedPhrase = wallet.seed || '';
  const birthdayNumber = (wallet.birthday && wallet.birthday.toString()) || '';

  const texts = useMemo<TextsType>(() => {
    const buttonTextsArray = translate('seed.buttontexts');
    return typeof buttonTextsArray === 'object'
      ? (buttonTextsArray as TextsType)
      : ({} as TextsType);
  }, [translate]);

  const onClickOKHide = () => {
    onClickOK();
    clear();
  };

  //console.log('=================================');
  //console.log(wallet.seed, wallet.birthday);
  //console.log('render seed', privacy);

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <View style={[styles.screen, { backgroundColor: colors.bgCanvas }]}>
        <Header
          title={translate('seed.title') + ' (' + translate(`seed.new`) + ')'}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noUfvkIcon={true}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar}
          translate={translate}
          netInfo={netInfo}
          privacy={privacy}
          closeScreen={onClickOKHide}
        />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          <RegText style={styles.warning}>
            {translate('seed.text-readonly') as string}
          </RegText>
          <View style={[styles.seedBox, { borderColor: colors.fgDefault }]}>
            <TouchableOpacity
              onPress={() => {
                if (seedPhrase) {
                  Clipboard.setString(seedPhrase);
                  if (addLastSnackbar) {
                    addLastSnackbar({
                      message: translate('seed.tapcopy-seed-message') as string,
                      duration: SnackbarDurationEnum.short,
                      screenName: [screenName],
                    });
                  }
                  setSeedShown(true);
                  if (privacy) {
                    setTimeout(() => {
                      setSeedShown(false);
                    }, 5 * 1000);
                  }
                }
              }}
            >
              <RegText color={colors.fgDefault} style={styles.centerText}>
                {!expandSeed ? Utils.trimToSmall(seedPhrase, 5) : seedPhrase}
              </RegText>
            </TouchableOpacity>
            <View style={styles.copyRow}>
              <View />
              <TouchableOpacity
                onPress={() => {
                  if (seedPhrase) {
                    Clipboard.setString(seedPhrase);
                    if (addLastSnackbar) {
                      addLastSnackbar({
                        message: translate(
                          'seed.tapcopy-seed-message',
                        ) as string,
                        duration: SnackbarDurationEnum.short,
                        screenName: [screenName],
                      });
                    }
                  }
                }}
              >
                <Text style={[styles.copyLink, { color: colors.fgDefault }]}>
                  {translate('seed.tapcopy') as string}
                </Text>
              </TouchableOpacity>
              <View />
            </View>
          </View>

          <View style={styles.birthdaySection}>
            <FadeText style={styles.centerText}>
              {translate('seed.birthday-readonly') as string}
            </FadeText>
            <TouchableOpacity
              onPress={() => {
                if (birthdayNumber) {
                  Clipboard.setString(birthdayNumber);
                  if (addLastSnackbar) {
                    addLastSnackbar({
                      message: translate(
                        'seed.tapcopy-birthday-message',
                      ) as string,
                      duration: SnackbarDurationEnum.short,
                      screenName: [screenName],
                    });
                  }
                  setBirthdayShown(true);
                  if (privacy) {
                    setTimeout(() => {
                      setBirthdayShown(false);
                    }, 5 * 1000);
                  }
                }
              }}
            >
              <RegText color={colors.fgDefault} style={styles.centerText}>
                {!expandBirthday
                  ? Utils.trimToSmall(birthdayNumber, 1)
                  : birthdayNumber}
              </RegText>
            </TouchableOpacity>
          </View>
          <View style={styles.bottomSpacer} />
        </ScrollView>
        <View style={styles.footer}>
          <LiquidPrimaryButton
            title={!!texts && !!texts.new ? texts.new[0] : ''}
            onPress={() => onClickOKHide()}
            style={styles.stretch}
          />
        </View>
      </View>
    </ToastProvider>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    height: '80%',
    maxHeight: '80%',
  },
  scrollContent: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  warning: {
    marginTop: 0,
    padding: space.xl,
    textAlign: 'center',
    fontWeight: '900',
  },
  seedBox: {
    margin: space.md,
    padding: space.md,
    borderWidth: 1,
    borderRadius: 10,
    maxHeight: '45%',
  },
  centerText: {
    textAlign: 'center',
  },
  copyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  copyLink: {
    textDecorationLine: 'underline',
    padding: space.md,
    marginTop: 0,
    textAlign: 'center',
    minHeight: 48,
  },
  birthdaySection: {
    marginTop: space.md,
    alignItems: 'center',
  },
  bottomSpacer: {
    marginBottom: space.xxxl,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: space.md,
    paddingBottom: space.xl,
    paddingHorizontal: space.lg,
  },
  stretch: {
    alignSelf: 'stretch',
  },
});

export default NewSeed;
