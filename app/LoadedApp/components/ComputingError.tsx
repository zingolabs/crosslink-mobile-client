import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import RegText from '../../../components/Components/RegText';
import { LoadedAppStackParamList } from '../../types';
import { RouteEnum } from '../../AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import FadeText from '../../../components/Components/FadeText';
import LiquidPrimaryButton from '../../../components/Components/LiquidButton/LiquidPrimaryButton';
import { radiusCard, radiusPill, space, text, useTheme } from '../../theme';

type ComputingErrorProps = NativeStackScreenProps<
  LoadedAppStackParamList,
  RouteEnum.ComputingError
>;

const ComputingError: React.FunctionComponent<ComputingErrorProps> = ({
  route,
}) => {
  const navigation: any = useNavigation();
  const { colors } = useTheme();

  const [showDetails, setShowDetails] = useState<boolean>(false);

  const error =
    !!route.params && route.params.error !== undefined
      ? route.params.error
      : '';

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgCanvas }]}>
      <View style={styles.center}>
        <View style={[styles.card, { backgroundColor: colors.bgSurface }]}>
          <View style={styles.iconWrap}>
            {/* No dangerTint token: a low-alpha fill derived from the token. */}
            <View
              style={[
                styles.iconDisc,
                { backgroundColor: colors.bgDangerTint },
              ]}
            >
              <FontAwesomeIcon
                icon={faXmark}
                color={colors.fgDanger}
                size={50}
              />
            </View>
          </View>
          <RegText style={[text.title1, styles.centerSelf]}>
            {'An error\noccurred'}
          </RegText>

          <View style={styles.actions}>
            <LiquidPrimaryButton
              tintColor={colors.bgSurface}
              title={'Details'}
              onPress={() => {
                setShowDetails(true);
              }}
            />
            <LiquidPrimaryButton
              title={'Back'}
              onPress={() => {
                if (navigation.canGoBack) {
                  navigation.goBack();
                }
              }}
            />
          </View>

          {showDetails && <FadeText style={styles.details}>{error}</FadeText>}
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
    marginTop: space.xxxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: space.md,
    paddingBottom: space.xl,
    gap: space.md,
  },
  details: {
    opacity: 1,
  },
});

export default ComputingError;
