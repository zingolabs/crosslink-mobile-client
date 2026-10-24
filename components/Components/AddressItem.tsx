import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useAppLoadedActions, useAppLoadedSettings } from '../../app/context';
import RegText from './RegText';
import Utils from '../../app/utils';
import {
  SendPageStateClass,
  ToAddrClass,
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
  const { translate, addLastSnackbar, setSendPageState } =
    useAppLoadedActions();
  const { privacy, readOnly, selectIndexerServer } = useAppLoadedSettings();
  const { colors } = useTheme();

  const [expandAddress, setExpandAddress] = useState<boolean>(false);
  const [numLinesAddress, setNumLinesAddress] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const numLinesAdd = address
      ? address.length < 50
        ? 2
        : address.length / 30
      : 0;
    setNumLinesAddress(numLinesAdd);
    setLoading(false);
    // the address prop make no sense that it is going to change,
    // but the address book can change in any moment.
  }, [address]);

  useEffect(() => {
    if (!oneLine) {
      if (privacy) {
        setExpandAddress(false);
      }
    }
  }, [oneLine, privacy]);

  //console.log('addressItem - render');

  return (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={colors.fgAccent} />
      ) : (
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
                  const sendPageState = new SendPageStateClass(
                    new ToAddrClass(0),
                  );
                  sendPageState.toaddr.to = address;
                  setSendPageState(sendPageState);
                  navigation.navigate(RouteEnum.Send);
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
      )}
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
