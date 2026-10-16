/* eslint-disable react-native/no-inline-styles */
import React, { ReactNode, useContext } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import FadeText from './FadeText';
import RegText from './RegText';
import { ContextAppLoaded } from '../../app/context';
import { ScreenEnum, SnackbarDurationEnum } from '../../app/AppState';
import { useTheme } from '../../app/theme';

type DetailLineProps = {
  label: string;
  value?: string;
  children?: ReactNode;
  testID?: string;
  screenName: ScreenEnum;
};

const DetailLine: React.FunctionComponent<DetailLineProps> = ({
  label,
  value,
  children,
  testID,
  screenName,
}) => {
  const { colors } = useTheme();
  const context = useContext(ContextAppLoaded);
  const { addLastSnackbar, translate } = context;

  return (
    <View style={{ display: 'flex', marginTop: 20 }}>
      <FadeText>{label}</FadeText>
      {!!value && (
        <TouchableOpacity
          onPress={() => {
            Clipboard.setString(value);
            addLastSnackbar({
              message: translate('txtcopied') as string,
              duration: SnackbarDurationEnum.short,
              screenName: [screenName],
            });
          }}
        >
          <RegText testID={testID} color={colors.fgDefault}>
            {value}
          </RegText>
        </TouchableOpacity>
      )}
      {children}
    </View>
  );
};

export default DetailLine;
