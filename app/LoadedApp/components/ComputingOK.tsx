import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import RegText from '../../../components/Components/RegText';
import { LoadedAppStackParamList } from '../../types';
import { RouteEnum, ValueTransferType } from '../../AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppLoadedWallet } from '../../context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import Button from '../../../components/Components/Button';
import { radiusCard, radiusPill, space, text, useTheme } from '../../theme';

type ComputingOKProps = NativeStackScreenProps<
  LoadedAppStackParamList,
  RouteEnum.ComputingOK
>;

const ComputingOK: React.FunctionComponent<ComputingOKProps> = ({ route }) => {
  const navigation: any = useNavigation();
  const { valueTransfers } = useAppLoadedWallet();
  const { colors } = useTheme();

  const txid =
    !!route.params && route.params.txid !== undefined ? route.params.txid : '';

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgCanvas }]}>
      <View style={styles.center}>
        <View style={[styles.card, { backgroundColor: colors.bgSurface }]}>
          <View style={styles.iconWrap}>
            {/* No successTint token: a low-alpha fill derived from the token. */}
            <View
              style={[
                styles.iconDisc,
                { backgroundColor: colors.bgSuccessTint },
              ]}
            >
              <FontAwesomeIcon
                icon={faCheck}
                color={colors.fgSuccess}
                size={50}
              />
            </View>
          </View>
          <RegText style={[text.title1, styles.centerSelf]}>Sent</RegText>

          <View style={styles.actions}>
            <Button
              variant="secondary"
              title={'Details'}
              onPress={() => {
                // have to be the first element in the VT's -> index 0.
                // we cannot be 100% sure...
                const vt: ValueTransferType | undefined =
                  valueTransfers?.filter(
                    (v: ValueTransferType) => v.txid === txid,
                  )[0];
                navigation.navigate(RouteEnum.ValueTransferDetail, {
                  vt: vt,
                  totalLength:
                    valueTransfers !== null ? valueTransfers.length : 0,
                });
              }}
            />
            <Button
              title={'Back'}
              onPress={() => {
                navigation.reset({
                  index: 0,
                  routes: [
                    {
                      name: RouteEnum.MainTabs,
                      params: {
                        screen: RouteEnum.History,
                      },
                    },
                  ],
                });
              }}
            />
          </View>
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
    paddingHorizontal: space.xl,
    paddingVertical: space.xxxl,
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
  actions: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: space.xxxl,
    paddingBottom: space.xl,
    gap: space.md,
  },
});

export default ComputingOK;
