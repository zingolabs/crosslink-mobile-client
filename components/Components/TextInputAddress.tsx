import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faQrcode, faXmark } from '@fortawesome/free-solid-svg-icons';

import { useAppLoadedActions, useAppLoadedSettings } from '../../app/context';
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
  const { translate } = useAppLoadedActions();
  const { indexerServer } = useAppLoadedSettings();
  const { colors } = useTheme();

  const [validAddress, setValidAddress] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - KO

  useEffect(() => {
    const parseAddress = async (
      addr: string,
    ): Promise<{ isValid: boolean; onlyOrchardUA: string }> => {
      return await Utils.isValidAddress(addr, indexerServer.chainName);
    };

    if (address) {
      parseAddress(address).then(r => {
        //console.log(r);
        setValidAddress(r.isValid ? 1 : -1);
        setError(r.isValid ? '' : (translate('send.invalidaddress') as string));
      });
    } else {
      setValidAddress(0);
      setError('');
    }
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
