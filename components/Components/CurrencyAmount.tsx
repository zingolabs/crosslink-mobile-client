/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { Text, View, TextStyle, TouchableOpacity } from 'react-native';
import { getNumberFormatSettings } from 'react-native-localize';

import Utils from '../../app/utils';
import { CurrencyEnum } from '../../app/AppState';
import { useTheme } from '../../app/theme';

type CurrencyAmountProps = {
  price?: number;
  amtZec?: number;
  style?: TextStyle;
  currency: CurrencyEnum;
  privacy?: boolean;
  selectable?: boolean;
};

const CurrencyAmount: React.FunctionComponent<CurrencyAmountProps> = ({
  price,
  style,
  amtZec,
  currency,
  privacy,
  selectable,
}) => {
  const [revealed, setRevealed] = useState<boolean>(false);
  const privacyHigh = !!privacy && !revealed;
  const { colors } = useTheme();
  const { decimalSeparator } = getNumberFormatSettings();

  const zeroString = '0' + decimalSeparator + '00';
  let currencyString: string;
  if (
    typeof price === 'undefined' ||
    typeof amtZec === 'undefined' ||
    price <= 0
  ) {
    currencyString = '-' + decimalSeparator + '--';
  } else {
    currencyString = Utils.parseNumberFloatToStringLocale(price * amtZec, 2);
    if (currencyString === zeroString && amtZec > 0) {
      currencyString = '< 0' + decimalSeparator + '01';
    }
  }

  const onPress = () => {
    setRevealed(true);
    setTimeout(() => setRevealed(false), 5 * 1000);
  };

  if (
    currency === CurrencyEnum.USDCurrency ||
    currency === CurrencyEnum.USDTORCurrency
  ) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <TouchableOpacity disabled={!privacyHigh} onPress={onPress}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            {privacyHigh ? (
              <Text
                style={{
                  color: colors.fgMuted,
                  fontSize: 20,
                  fontWeight: '700',
                  ...style,
                }}
              >
                {'$ -' + decimalSeparator + '--'}
              </Text>
            ) : (
              <Text
                style={{
                  color: colors.fgMuted,
                  fontSize: 20,
                  fontWeight: '700',
                  ...style,
                }}
                selectable={selectable}
              >
                {'$ ' + currencyString}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  } else {
    return null;
  }
};

export default CurrencyAmount;
