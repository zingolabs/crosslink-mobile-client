import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAppLoadedActions } from '../../../app/context';
import {
  AddressKindEnum,
  ScreenEnum,
  SnackbarDurationEnum,
  TransparentAddressClass,
  UnifiedAddressClass,
} from '../../../app/AppState';
import RegText from '../../Components/RegText';
import TransparentAddressWarning from './TransparentAddressWarning';
import AddressQr from './AddressQr';
import AddressCopyRow from './AddressCopyRow';
import { space } from '../../../app/theme';

type ReceiveAddressCardProps = {
  address?: UnifiedAddressClass | TransparentAddressClass;
  screenName: ScreenEnum;
  // Switches the receive tab, e.g. back to the unified address.
  onChangeTab: (index: number) => void;
};

// Everything shown for one address kind on the receive screen:
// optional transparent warning, the QR, and the compact address row.
const ReceiveAddressCard: React.FunctionComponent<ReceiveAddressCardProps> = ({
  address,
  screenName,
  onChangeTab,
}) => {
  const { translate, addLastSnackbar } = useAppLoadedActions();

  const isUnified = address?.addressKind === AddressKindEnum.u;
  const hasAddress =
    !!address &&
    address.address !== (translate('receive.noaddress') as string);

  const doCopy = () => {
    if (!address) {
      return;
    }
    addLastSnackbar({
      message: translate('history.addresscopied') as string,
      duration: SnackbarDurationEnum.short,
      screenName: [screenName],
    });
  };

  if (!address || !hasAddress) {
    return (
      <View style={styles.noAddressRow}>
        <RegText>{address ? address.address : ''}</RegText>
      </View>
    );
  }

  return (
    <View style={styles.column}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {!isUnified && (
          <TransparentAddressWarning onChangeTab={onChangeTab} />
        )}
        <AddressQr address={address.address} />
        <AddressCopyRow address={address.address} onCopied={doCopy} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    flexDirection: 'column',
    width: '100%',
  },
  scroll: {
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: space.xl,
  },
  noAddressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: space.xxxl,
    marginBottom: space.xxxl,
  },
});

export default ReceiveAddressCard;
