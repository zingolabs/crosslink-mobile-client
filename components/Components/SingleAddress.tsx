import React, { useState, useEffect, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, {
  CSSTransitionProperties,
  cubicBezier,
  useReducedMotion,
} from 'react-native-reanimated';

import { useAppLoadedActions, useAppLoadedSettings } from '../../app/context';
import {
  AddressKindEnum,
  ScreenEnum,
  SnackbarDurationEnum,
  TransparentAddressClass,
  UnifiedAddressClass,
} from '../../app/AppState';
import RegText from './RegText';
import Clipboard from '@react-native-clipboard/clipboard';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { CopyIcon } from './Icons/CopyIcon';
import { TriangleAlert } from './Icons/TriangleAlert';
import { ShieldIcon } from './Icons/ShieldIcon';
import Address from './Address/Address';
import { duration, radiusPill, space, text, useTheme } from '../../app/theme';

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

type SingleAddressProps = {
  address?: UnifiedAddressClass | TransparentAddressClass;
  screenName: ScreenEnum;
  index: number;
  setIndex: (i: number) => void;
  total: number;
  show: (s: 'NA' | 'VA' | 'TW' | 'EA') => void;
  changeIndex?: (index: number) => void;
  hasTransparent?: boolean;
  showMoreOptions?: boolean;
  setShowMoreOptions?: React.Dispatch<React.SetStateAction<boolean>>;
};

const SingleAddress: React.FunctionComponent<SingleAddressProps> = ({
  address,
  screenName,
  show,
  changeIndex,
  showMoreOptions,
  setShowMoreOptions,
}) => {
  const { translate, addLastSnackbar } = useAppLoadedActions();
  const { privacy } = useAppLoadedSettings();
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [shieldPressed, setShieldPressed] = useState<boolean>(false);

  const [expandQRAddress, setExpandQRAddress] = useState<boolean>(true);

  const press: CSSTransitionProperties = {
    transitionProperty: ['transform', 'opacity'],
    transitionDuration: reducedMotion ? '0ms' : `${duration.press}ms`,
    transitionTimingFunction: EASE_OUT,
  };

  const animatedHeight = useSharedValue(0);
  const animatedOpacity = useSharedValue(0);

  const scrollViewRef = useRef<ScrollView>(null);

  const isUnified = address?.addressKind === AddressKindEnum.u;

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    opacity: animatedOpacity.value,
    transform: [{ translateY: showMoreOptions ? 0 : -5 }],
    overflow: 'hidden',
  }));

  useEffect(() => {
    if (privacy) {
      setExpandQRAddress(false);
    } else {
      setExpandQRAddress(true);
    }
  }, [privacy]);

  useEffect(() => {
    if (!expandQRAddress && !privacy) {
      setExpandQRAddress(true);
    }
  }, [expandQRAddress, privacy]);

  useEffect(() => {
    return () => {
      setShowMoreOptions && setShowMoreOptions(false);
      animatedStyle.height = 0;
    };
  }, [animatedStyle, setShowMoreOptions]);

  const doCopy = () => {
    Clipboard.setString(address ? address.address : '');
    addLastSnackbar({
      message: translate('history.addresscopied') as string,
      duration: SnackbarDurationEnum.short,
      screenName: [screenName],
    });
  };

  return (
    <View style={styles.column}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {address &&
        address.address !== (translate('receive.noaddress') as string) ? (
          <>
            {address && !isUnified && (
              <View
                style={[
                  styles.warningCard,
                  {
                    backgroundColor: colors.bgWarning,
                    borderColor: colors.borderWarning,
                  },
                ]}
              >
                <View style={styles.warningHeader}>
                  <TriangleAlert
                    color={colors.fgWarning}
                    size={24}
                    style={styles.warningIcon}
                  />
                  <Text
                    style={[
                      styles.warningTitle,
                      { color: colors.fgWarningEmphasis },
                    ]}
                  >
                    {translate('receive.transparent.warning.title') as string}
                  </Text>
                </View>
                <Text style={{ color: colors.fgWarningMuted }}>
                  {
                    translate(
                      'receive.transparent.warning.description',
                    ) as string
                  }
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    changeIndex && changeIndex(0);
                  }}
                  onPressIn={() => setShieldPressed(true)}
                  onPressOut={() => setShieldPressed(false)}
                  pressRetentionOffset={space.lg}
                >
                  <Animated.View
                    style={[
                      styles.shieldButton,
                      { backgroundColor: colors.bgAccent },
                      press,
                      shieldPressed && styles.shieldPressed,
                    ]}
                  >
                    <ShieldIcon
                      color={colors.bgCanvas}
                      size={24}
                      style={styles.shieldIcon}
                    />
                    <Text
                      style={[styles.shieldLabel, { color: colors.bgCanvas }]}
                    >
                      {
                        translate(
                          'receive.transparent.warning.button',
                        ) as string
                      }
                    </Text>
                  </Animated.View>
                </Pressable>
              </View>
            )}

            <View
              style={[styles.qrWrap, { backgroundColor: colors.fgDefault }]}
            >
              <QRCode
                value={address ? address.address : ''}
                size={200}
                ecl="L"
                backgroundColor={colors.fgDefault}
                logo={require('../../assets/img/logobig-zingo-delegator.png')}
                logoSize={30}
                logoBackgroundColor={colors.fgDefault}
                logoBorderRadius={5} /* android not soported */
                logoMargin={3}
              />
            </View>

            <View
              style={[
                styles.addressCard,
                { backgroundColor: colors.bgSurface },
              ]}
            >
              <Address
                address={address?.address ? address.address : ''}
                style={{ ...styles.address, color: colors.fgMuted }}
                onPress={() => show('EA')}
              />
              <View style={styles.addressActions}>
                <TouchableOpacity onPress={doCopy}>
                  <View
                    style={[
                      styles.copyDisc,
                      { borderColor: colors.borderMuted },
                    ]}
                  >
                    <CopyIcon
                      color={colors.fgMuted}
                      size={24}
                      opacity={0.9}
                      style={styles.copyIcon}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.noAddressRow}>
            <RegText>{address ? address.address : ''}</RegText>
          </View>
        )}
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
  warningCard: {
    width: '95%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: space.md,
    marginTop: space.md,
  },
  warningHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.xs,
  },
  warningIcon: {
    marginRight: space.md,
  },
  warningTitle: {
    ...text.headline,
  },
  shieldButton: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: space.md,
    borderRadius: 5,
    marginTop: space.md,
  },
  shieldPressed: {
    transform: [{ scale: 0.975 }],
    opacity: 0.8,
  },
  shieldIcon: {
    marginRight: space.xs,
  },
  shieldLabel: {
    ...text.caption,
  },
  qrWrap: {
    marginTop: space.xl,
    marginHorizontal: space.xl,
    padding: space.md,
    borderRadius: 15,
  },
  addressCard: {
    marginTop: space.xxxl,
    padding: space.md,
    width: '90%',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  address: {
    ...text.headline,
    opacity: 0.8,
  },
  addressActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyDisc: {
    borderRadius: radiusPill,
    paddingHorizontal: space.xs,
    paddingVertical: space.xs,
    marginHorizontal: space.md,
  },
  copyIcon: {
    margin: space.xs,
  },
  noAddressRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: space.xxxl,
    marginBottom: space.xxxl,
  },
});

export default SingleAddress;
