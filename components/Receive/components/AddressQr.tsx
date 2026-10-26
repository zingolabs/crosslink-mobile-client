import React from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { space, useTheme } from '../../../app/theme';

type AddressQrProps = {
  address: string;
};

// The receive QR code with the brand mark in its center.
const AddressQr: React.FunctionComponent<AddressQrProps> = ({ address }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.fgDefault }]}>
      <QRCode
        value={address}
        size={200}
        ecl="L"
        backgroundColor={colors.fgDefault}
        logo={require('../../../assets/img/qr-logo.png')}
        logoSize={30}
        logoBackgroundColor={colors.fgDefault}
        logoBorderRadius={5} /* android not soported */
        logoMargin={3}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: space.xl,
    marginHorizontal: space.xl,
    padding: space.md,
    borderRadius: 15,
  },
});

export default AddressQr;
