import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from 'react-native';

import { useScrollToTop } from '@react-navigation/native';
import {
  AddressKindEnum,
  RouteEnum,
  ScreenEnum,
  TransparentAddressClass,
  UnifiedAddressClass,
} from '../../app/AppState';
import { LoadedAppStackParamList } from '../../app/types';
import FadeText from '../Components/FadeText';
import AlSummaryLine from './components/AlSummaryLine';
import {
  useAppLoadedActions,
  useAppLoadedWallet,
  useAppLoadedUi,
} from '../../app/context';
import { Header } from '../Header';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAngleUp } from '@fortawesome/free-solid-svg-icons';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { RPCAddressScopeEnum } from '../../app/wallet/enums/RPCAddressScopeEnum';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import LiquidPrimaryButton from '../Components/LiquidButton/LiquidPrimaryButton';
import { radiusPill, space, useTheme } from '../../app/theme';

type AddressListProps = NativeStackScreenProps<
  LoadedAppStackParamList,
  RouteEnum.AddressList
>;

const AddressList: React.FunctionComponent<AddressListProps> = ({
  navigation,
  route,
}) => {
  const setIndex =
    !!route.params && route.params.setIndex !== undefined
      ? route.params.setIndex
      : () => {};
  const { translate, removeFirstSnackbar } = useAppLoadedActions();
  const { addresses } = useAppLoadedWallet();
  const { snackbars } = useAppLoadedUi();
  const { colors } = useTheme();
  const { clear } = useToast();
  const screenName = ScreenEnum.AddressList;

  const [numAl, setNumAl] = useState<number>(50);
  const [loadMoreButton, setLoadMoreButton] = useState<boolean>(false);
  const [addressesSliced, setAddressesSliced] = useState<
    (UnifiedAddressClass | TransparentAddressClass)[]
  >([]);

  const [isAtTop, setIsAtTop] = useState<boolean>(true);
  const [isScrollingToTop, setIsScrollingToTop] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [addressKind, setAddressKind] = useState<AddressKindEnum>(
    !!route.params && route.params.addressKind !== undefined
      ? route.params.addressKind
      : AddressKindEnum.u,
  );

  const scrollViewRef = useRef<ScrollView>(null);

  useScrollToTop(scrollViewRef as React.RefObject<ScrollView>);

  useEffect(() => {
    const _addressKind =
      !!route.params && route.params.addressKind !== undefined
        ? route.params.addressKind
        : AddressKindEnum.u;
    setAddressKind(_addressKind);
  }, [route, route.params, route.params?.addressKind]);

  const fetchAddressFiltered = useMemo(async () => {
    if (!addresses) {
      return [];
    }
    if (addressKind === AddressKindEnum.u) {
      return addresses.filter(
        (a: UnifiedAddressClass | TransparentAddressClass) =>
          a.addressKind === addressKind,
      );
    } else {
      return addresses.filter(
        (a: UnifiedAddressClass | TransparentAddressClass) =>
          a.addressKind === addressKind &&
          a.scope === RPCAddressScopeEnum.external,
      );
    }
  }, [addressKind, addresses]);

  useEffect(() => {
    (async () => {
      const abf = await fetchAddressFiltered;
      setLoadMoreButton(numAl < abf.length);
      setAddressesSliced(abf.slice(0, numAl));
      setLoading(false);
    })();
  }, [fetchAddressFiltered, numAl]);

  const loadMoreClicked = useCallback(() => {
    setNumAl(numAl + 50);
  }, [numAl]);

  const handleScrollToTop = useCallback(() => {
    if (scrollViewRef.current && !isScrollingToTop) {
      setIsScrollingToTop(true);

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Force set to top immediately for UI feedback
      setIsAtTop(true);

      // Scroll to top
      scrollViewRef.current.scrollTo({ y: 0, animated: true });

      // Set timeout to reset scrolling state
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrollingToTop(false);
        // Double-check position after scroll animation
        if (scrollViewRef.current) {
          setIsAtTop(true); // For ScrollView, assume success
        }
      }, 800);
    }
  }, [isScrollingToTop]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = event.nativeEvent;
      const isTop = contentOffset.y <= 100;

      // If we're scrolling to top and we've reached the top, stop the scrolling state
      if (isScrollingToTop && isTop) {
        setIsScrollingToTop(false);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
      }

      // Always update isAtTop for manual scrolling
      setIsAtTop(isTop);
    },
    [isScrollingToTop],
  );

  //console.log('render Address Book - 4', currentItem, action);

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <View style={[styles.screen, { backgroundColor: colors.bgCanvas }]}>
        <Header
          title={`${translate('addresslist.title')} - ${
            addressKind === AddressKindEnum.u
              ? translate('addresslist.unified')
              : translate('addresslist.transparent')
          }`}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
          closeScreen={() => {
            clear();
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
        />
        <ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          testID="address.scroll-view"
          keyboardShouldPersistTaps="handled"
          style={styles.list}
          contentContainerStyle={styles.content}
        >
          {addressesSliced.length === 0 && !loading && (
            <View style={styles.emptyStateTop}>
              <FadeText style={{ color: colors.fgAccent }}>
                {translate('history.empty') as string}
              </FadeText>
            </View>
          )}
          {loading ? (
            <ActivityIndicator
              style={styles.spinner}
              size={25}
              color={colors.fgAccentDisabled}
            />
          ) : (
            <>
              {addressesSliced.map((alItem, index) => {
                return (
                  <View key={`container-${index}-${alItem.address}`}>
                    <AlSummaryLine
                      key={`line-${index}-${alItem.address}`}
                      index={index}
                      setIndex={setIndex}
                      item={alItem}
                      closeScreen={() => {
                        clear();
                        if (navigation.canGoBack()) {
                          navigation.goBack();
                        }
                      }}
                      screenName={screenName}
                    />
                  </View>
                );
              })}
            </>
          )}
          {loadMoreButton ? (
            <View style={styles.loadMoreWrap}>
              <LiquidPrimaryButton
                tintColor={colors.bgSurface}
                title={translate('history.loadmore') as string}
                onPress={loadMoreClicked}
              />
            </View>
          ) : (
            <>
              {!!addressesSliced && !!addressesSliced.length && !loading && (
                <View style={styles.loadMoreWrap}>
                  <FadeText style={{ color: colors.fgAccent }}>
                    {translate('history.end') as string}
                  </FadeText>
                </View>
              )}
            </>
          )}
        </ScrollView>
        {!isAtTop && (
          <Pressable
            onPress={handleScrollToTop}
            disabled={isScrollingToTop}
            style={({ pressed }) => [
              styles.fab,
              {
                backgroundColor: colors.bgChrome,
                borderColor: colors.borderMuted,
                opacity: isScrollingToTop ? 0.5 : 1,
              },
              { transform: [{ scale: pressed ? 0.9 : 1 }] },
            ]}
          >
            <FontAwesomeIcon
              style={styles.fabIcon}
              size={20}
              icon={faAngleUp}
              color={colors.fgMuted}
            />
          </Pressable>
        )}
      </View>
    </ToastProvider>
  );
};

export default React.memo(AddressList);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    height: '80%',
    maxHeight: '80%',
  },
  content: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  emptyStateTop: {
    height: 150,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: space.xxxl,
  },
  loadMoreWrap: {
    height: 150,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: space.xs,
    marginBottom: space.xxxl,
  },
  spinner: {
    marginTop: space.sm,
    marginRight: space.sm,
  },
  fab: {
    position: 'absolute',
    bottom: 105,
    right: 10,
    paddingHorizontal: space.xs,
    paddingVertical: space.md,
    borderRadius: radiusPill,
    borderWidth: 1,
  },
  fabIcon: {
    marginLeft: space.xs,
    marginRight: space.xs,
  },
});
