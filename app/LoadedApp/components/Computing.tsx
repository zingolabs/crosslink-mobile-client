/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import RegText from '../../../components/Components/RegText';
import { LoadedAppStackParamList } from '../../types';
import { RouteEnum, SendPageStateClass } from '../../AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Utils from '../../utils';
import ZecAmount from '../../../components/Components/ZecAmount';
import { useAppLoadedSettings, useAppLoadedWallet } from '../../context';
import { faPaperPlane } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useTheme } from '../../theme';

type ComputingProps = NativeStackScreenProps<
  LoadedAppStackParamList,
  RouteEnum.Computing
>;

const Computing: React.FunctionComponent<ComputingProps> = ({ route }) => {
  const { privacy } = useAppLoadedSettings();
  const { info } = useAppLoadedWallet();
  const { colors } = useTheme();

  const sendPageStatePar =
    !!route.params && route.params.sendPageStatePar !== undefined
      ? route.params.sendPageStatePar
      : ({} as SendPageStateClass);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgCanvas,
      }}
    >
      <View
        style={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: colors.bgSurface,
            padding: 50,
            width: '90%',
            borderRadius: 50,
          }}
        >
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              marginHorizontal: 8,
            }}
          >
            <View
              style={{
                borderRadius: 50,
                backgroundColor: '#1C78D24D',
                padding: 20,
                margin: 10,
              }}
            >
              <FontAwesomeIcon icon={faPaperPlane} color="#1C78D2" size={50} />
            </View>
          </View>
          <RegText style={{ fontSize: 30, alignSelf: 'center' }}>
            Sending
          </RegText>
          <ActivityIndicator
            size="large"
            color={colors.fgDefault}
            style={{ marginVertical: 20 }}
          />
        </View>
        <View
          style={{
            marginTop: 20,
            backgroundColor: colors.bgSurface,
            padding: 50,
            width: '90%',
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ZecAmount
            currencyName={info.currencyName}
            color={colors.fgDefault}
            size={20}
            amtZec={Utils.parseStringLocaleToNumberFloat(
              sendPageStatePar.toaddr.amount,
            )}
            privacy={privacy}
            style={{ fontWeight: '900', marginBottom: 20 }}
          />
          <RegText>{`To: ${Utils.trimToSmall(sendPageStatePar.toaddr.to, 10)}`}</RegText>
        </View>
      </View>
    </View>
  );
};

export default Computing;
