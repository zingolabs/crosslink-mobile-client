import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useFeedback, useSettings, useStatus } from '../../app/store';
import RegText from './RegText';
import Utils from '../../app/utils';
import {
  emptyToAddr,
  SnackbarDurationEnum,
  RouteEnum,
  SelectServerEnum,
  ScreenEnum,
} from '../../app/AppState';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { space, useTheme } from '../../app/theme';

type AddressItemProps = {
  address: string;
  screenName: ScreenEnum;
  oneLine?: boolean;
  onlyContact?: boolean;
  withIcon?: boolean;
  withSendIcon?: boolean;
  addressProtected?: boolean;
  ufvk?: boolean;
};

const AddressItem: React.FunctionComponent<AddressItemProps> = ({
  address,
  screenName,
  oneLine,
  onlyContact,
  withSendIcon,
  addressProtected,
  ufvk,
}) => {
  const navigation: any = useNavigation();
  const { translate, addLastSnackbar } = useFeedback();
  const { privacy, selectIndexerServer } = useSettings();
  const { readOnly } = useStatus();
  const { colors } = useTheme();

  const [expandAddress, setExpandAddress] = useState<boolean>(false);
  const [seenPrivacy, setSeenPrivacy] = useState<boolean>(privacy);
  const numLinesAddress = address
    ? address.length < 50
      ? 2
      : address.length / 30
    : 0;

  if (privacy !== seenPrivacy) {
    setSeenPrivacy(privacy);
    if (privacy && !oneLine) {
      setExpandAddress(false);
    }
  }

  //console.log('addressItem - render');

  return (
    <>
      {
        <View style={styles.row}>
          <View
            style={[styles.addressCol, onlyContact && styles.addressColTight]}
          >
            {!onlyContact && (
              <TouchableOpacity
                onPress={() => {
                  if (address && !oneLine && !addressProtected) {
                    Clipboard.setString(address);
                    addLastSnackbar({
                      message: ufvk
                        ? (translate('seed.tapcopy-ufvk-message') as string)
                        : (translate('history.addresscopied') as string),
                      duration: SnackbarDurationEnum.short,
                      screenName: [screenName],
                    });
                    setExpandAddress(true);
                    if (privacy) {
                      setTimeout(() => {
                        setExpandAddress(false);
                      }, 5 * 1000);
                    }
                  }
                }}
              >
                <View style={styles.addressLines}>
                  {!address && <RegText>{'Unknown'}</RegText>}
                  {!expandAddress && !!address && (
                    <RegText>{Utils.trimToSmall(address, 7)}</RegText>
                  )}
                  {expandAddress &&
                    !!address &&
                    Utils.splitStringIntoChunks(
                      address,
                      Number(numLinesAddress.toFixed(0)),
                    ).map((c: string, idx: number) => (
                      <RegText key={idx}>{c}</RegText>
                    ))}
                </View>
              </TouchableOpacity>
            )}
          </View>
          {withSendIcon &&
            !addressProtected &&
            !readOnly &&
            selectIndexerServer !== SelectServerEnum.offline && (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={() => {
                  // enviar
                  const toaddr = emptyToAddr();
                  toaddr.to = address;
                  navigation.navigate(RouteEnum.Send, { toaddr });
                }}
              >
                <FontAwesomeIcon
                  style={styles.sendIcon}
                  size={30}
                  icon={faPaperPlane}
                  color={colors.fgAccent}
                />
              </TouchableOpacity>
            )}
        </View>
      }
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginRight: space.md,
  },
  addressColTight: {
    marginRight: 0,
  },
  addressLines: {
    display: 'flex',
    flexDirection: 'column',
    flexWrap: 'wrap',
  },
  sendButton: {
    marginLeft: space.md,
  },
  sendIcon: {
    marginTop: space.xs,
  },
});

export default AddressItem;
