import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faQrcode, faXmark } from '@fortawesome/free-solid-svg-icons';

import {
  useFeedback,
  useSettings,
} from '../../app/store';
import ErrorText from './ErrorText';
import RegText from './RegText';
import Utils from '../../app/utils';
import { RouteEnum, ScreenEnum } from '../../app/AppState';
import { space, text, useTheme } from '../../app/theme';

type TextInputAddressProps = {
  address: string;
  setAddress: (a: string) => void;
  setError: (e: string) => void;
  disabled: boolean;
  showLabel: boolean;
  screenName: ScreenEnum;
  routeStack?: RouteEnum;
};
const TextInputAddress: React.FunctionComponent<TextInputAddressProps> = ({
  address,
  setAddress,
  setError,
  disabled,
  showLabel,
  screenName,
}) => {
  const navigation: any = useNavigation();
  const { translate } = useFeedback();
  const { indexerServer } = useSettings();
  const { colors } = useTheme();

  const [checked, setChecked] = useState<{
    address: string;
    valid: boolean;
  } | null>(null);
  const validAddress: number = !address
    ? 0
    : checked?.address === address
      ? checked.valid
        ? 1
        : -1
      : 0;

  useEffect(() => {
    if (!address) {
      setError('');
      return;
    }
    let cancelled = false;
    Utils.isValidAddress(address, indexerServer.chainName).then(r => {
      if (cancelled) {
        return;
      }
      setChecked({ address, valid: r.isValid });
      setError(r.isValid ? '' : (translate('send.invalidaddress') as string));
    });
    return () => {
      cancelled = true;
    };
  }, [address, indexerServer.chainName, setError, translate]);

  const setQrcodeModalShow = () => {
    if (screenName === ScreenEnum.Receive) {
      navigation.navigate(RouteEnum.ScannerAddress, {
        setAddress: (a: string) => setAddress(a),
        active: true,
      });
    }
  };

  //console.log('render input text address');

  return (
    <View style={styles.column}>
      <View style={styles.field}>
        {showLabel && (
          <View style={styles.labelRow}>
            <RegText>{translate('send.toaddress') as string}</RegText>
            {validAddress === 1 && (
              <FontAwesomeIcon icon={faCheck} color={colors.fgAccent} />
            )}
            {validAddress === -1 && (
              <ErrorText>
                {translate('send.invalidaddress') as string}
              </ErrorText>
            )}
          </View>
        )}
        <View style={[styles.inputWrap, { borderColor: colors.fgDefault }]}>
          <View style={styles.inputRow}>
            <View
              accessible={true}
              accessibilityLabel={translate('send.address-acc') as string}
              style={styles.inputArea}
            >
              <TextInput
                testID="send.addressplaceholder"
                placeholder={translate('send.addressplaceholder') as string}
                placeholderTextColor={colors.fgSubtle}
                style={[styles.input, { color: colors.fgDefault }]}
                value={address}
                onChangeText={(t: string) => setAddress(t)}
                editable={!disabled}
              />
            </View>
            <View style={styles.iconRow}>
              {address && !disabled && (
                <TouchableOpacity
                  onPress={() => {
                    setAddress('');
                  }}
                >
                  <FontAwesomeIcon
                    style={styles.iconMargin}
                    size={25}
                    icon={faXmark}
                    color={colors.fgAccentDisabled}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                testID="send.scan-button"
                disabled={disabled}
                accessible={true}
                accessibilityLabel={translate('send.scan-acc') as string}
                onPress={() => {
                  setQrcodeModalShow();
                }}
              >
                <FontAwesomeIcon
                  style={styles.iconMargin}
                  size={35}
                  icon={faQrcode}
                  color={colors.fgFaint}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    display: 'flex',
    flexDirection: 'column',
  },
  field: {
    display: 'flex',
    padding: space.md,
    marginTop: space.md,
  },
  labelRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 5,
    marginTop: space.xs,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputArea: {
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    ...text.subheadline,
    marginLeft: space.xs,
    backgroundColor: 'transparent',
  },
  iconRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMargin: {
    marginRight: space.xs,
  },
});

export default TextInputAddress;
