import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faQrcode,
  faCopy,
  faWallet,
  faTags,
} from '@fortawesome/free-solid-svg-icons';
import Clipboard from '@react-native-clipboard/clipboard';

import FadeText from '../../Components/FadeText';
import {
  UnifiedAddressClass,
  TransparentAddressClass,
  SnackbarDurationEnum,
  ScreenEnum,
} from '../../../app/AppState';
import Utils from '../../../app/utils';
import { useAppLoadedActions } from '../../../app/context';
import { space, text, useTheme } from '../../../app/theme';

type AlSummaryLineProps = {
  index: number;
  setIndex: (i: number) => void;
  item: UnifiedAddressClass | TransparentAddressClass;
  closeScreen: () => void;
  screenName: ScreenEnum;
};
const AlSummaryLine: React.FunctionComponent<AlSummaryLineProps> = ({
  index,
  setIndex,
  item,
  closeScreen,
  screenName,
}) => {
  const { translate, addLastSnackbar } = useAppLoadedActions();
  const { colors } = useTheme();

  const displayAddress: string = item.address
    ? Utils.trimToSmall(item.address, 7)
    : (translate('info.unknown') as string);

  const doCopy = () => {
    Clipboard.setString(item.address);
    addLastSnackbar({
      message: translate('history.addresscopied') as string,
      duration: SnackbarDurationEnum.short,
      screenName: [screenName],
    });
  };

  const doQr = () => {
    setIndex(index);
    closeScreen();
  };

  //console.log('render Ab SummaryLine - 5', index);

  return (
    <View style={styles.wrap}>
      <View style={[styles.row, { borderBottomColor: colors.borderFaint }]}>
        <View style={styles.main}>
          <TouchableOpacity onPress={() => {}}>
            <View style={styles.tagRow}>
              <FontAwesomeIcon
                style={styles.icon}
                size={24}
                icon={faTags}
                color={colors.fgDefault}
              />
            </View>
            <View style={styles.addressRow}>
              <FontAwesomeIcon
                style={styles.icon}
                size={24}
                icon={faWallet}
                color={colors.fgDefault}
              />
              <FadeText style={styles.address}>{displayAddress}</FadeText>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.actionCol}>
          <TouchableOpacity
            style={styles.action}
            onPress={() => {
              doCopy();
            }}
          >
            <FontAwesomeIcon
              style={styles.copyIcon}
              size={25}
              icon={faCopy}
              color={colors.fgMuted}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.actionCol}>
          <TouchableOpacity
            style={styles.action}
            onPress={() => {
              doQr();
            }}
          >
            <FontAwesomeIcon
              size={30}
              icon={faQrcode}
              color={colors.fgDefault}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    display: 'flex',
    flexDirection: 'column',
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    marginTop: space.lg,
    paddingBottom: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  main: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  tagRow: {
    flexDirection: 'row',
    marginBottom: space.xs,
  },
  icon: {
    marginHorizontal: space.md,
  },
  addressRow: {
    flexDirection: 'row',
  },
  address: {
    ...text.headline,
    marginHorizontal: space.md,
  },
  actionCol: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  action: {
    zIndex: 999,
    padding: space.md,
  },
  copyIcon: {
    opacity: 0.8,
  },
});

export default React.memo(AlSummaryLine);
