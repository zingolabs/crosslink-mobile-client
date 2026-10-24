import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import RegText from '../../../components/Components/RegText';
import { LoadedAppStackParamList } from '../../types';
import { RouteEnum, SendPageStateClass } from '../../AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Utils from '../../utils';
import ZecAmount from '../../../components/Components/ZecAmount';
import { useAppLoadedSettings, useAppLoadedWallet } from '../../context';
import { faPaperPlane } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { radiusCard, radiusPill, space, text, useTheme } from '../../theme';

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
    <View style={[styles.screen, { backgroundColor: colors.bgCanvas }]}>
      <View style={styles.center}>
        <View style={[styles.card, { backgroundColor: colors.bgSurface }]}>
          <View style={styles.iconWrap}>
            <View
              style={[
                styles.iconDisc,
                { backgroundColor: colors.bgAccentTint },
              ]}
            >
              <FontAwesomeIcon
                icon={faPaperPlane}
                color={colors.fgAccent}
                size={50}
              />
            </View>
          </View>
          <RegText style={[text.title1, styles.centerSelf]}>Sending</RegText>
          <ActivityIndicator
            size="large"
            color={colors.fgDefault}
            style={styles.spinner}
          />
        </View>
        <View
          style={[styles.amountCard, { backgroundColor: colors.bgSurface }]}
        >
          <ZecAmount
            currencyName={info.currencyName}
            color={colors.fgDefault}
            size={20}
            amtZec={Utils.parseStringLocaleToNumberFloat(
              sendPageStatePar.toaddr.amount,
            )}
            privacy={privacy}
            style={styles.amount}
          />
          <RegText>{`To: ${Utils.trimToSmall(sendPageStatePar.toaddr.to, 10)}`}</RegText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: space.xxxl,
    width: '90%',
    borderRadius: radiusCard,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: space.sm,
  },
  iconDisc: {
    borderRadius: radiusPill,
    padding: space.xl,
    margin: space.md,
  },
  centerSelf: {
    alignSelf: 'center',
  },
  spinner: {
    marginVertical: space.xl,
  },
  amountCard: {
    marginTop: space.xl,
    padding: space.xxxl,
    width: '90%',
    borderRadius: radiusCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: {
    fontWeight: '900',
    marginBottom: space.xl,
  },
});

export default Computing;
