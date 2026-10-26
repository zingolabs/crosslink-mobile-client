import React, {
  useState,
  ReactNode,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  Dimensions,
  Keyboard,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  TabView,
  SceneRendererProps,
  Route,
  NavigationState,
} from 'react-native-tab-view';
import { useNavigation } from '@react-navigation/native';

import ReceiveAddressCard from './components/ReceiveAddressCard';
import { LoadedAppStackParamList } from '../../app/types';
import {
  useAppLoadedActions,
  useAppLoadedWallet,
  useAppLoadedUi,
} from '../../app/context';

import {
  AddressKindEnum,
  SecurityType,
  UnifiedAddressClass,
  TransparentAddressClass,
  ScreenEnum,
  RouteEnum,
} from '../../app/AppState';
import { RPCAddressScopeEnum } from '../../app/rpc/enums/RPCAddressScopeEnum';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import NewAddress from './components/NewAddress';
import VerifyAddress from './components/VerifyAddress';
import { ToastProvider, useToast } from 'react-native-toastier';
import Snackbars from '../Components/Snackbars';
import TransparentWarning from './components/TransparentWarning';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderTitle } from '../Header';
import { space, useTheme } from '../../app/theme';

type ReceiveProps = NativeStackScreenProps<
  LoadedAppStackParamList,
  RouteEnum.Receive
> & {
  setSecurityOption: (s: SecurityType) => Promise<void>;
};

const Receive: React.FunctionComponent<ReceiveProps> = (
  {
    // side menu
    // balance
    // privacy
    // shielding
    // for receive
  },
) => {
  const navigation: any = useNavigation();
  const { translate, removeFirstSnackbar } = useAppLoadedActions();
  const { addresses, defaultUnifiedAddress } = useAppLoadedWallet();
  const { snackbars } = useAppLoadedUi();
  const { colors } = useTheme();
  const { clear } = useToast();
  const screenName = ScreenEnum.Receive;

  const [index, setIndex] = useState<number>(0);
  const [routes, setRoutes] = useState<{ key: string; title: string }[]>([]);
  const [sheetType, setSheetType] = useState<'NA' | 'VA' | 'TW' | 'EA' | null>(
    null,
  );

  const [uAddr, setUAddr] = useState<UnifiedAddressClass[]>([]);
  const [, setTAddr] = useState<TransparentAddressClass[]>([]);
  const [uAddrIndex, setUAddrIndex] = useState<number | null>(null);
  const [, setTAddrIndex] = useState<number | null>(null);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const [indexBottomSheet, setIndexBottomSheet] = useState<number>(-1);
  const [heightLayout, setHeightLayout] = useState<number>(10);

  const insets = useSafeAreaInsets();

  const snapPoints = useMemo(() => {
    let snap1: number = (heightLayout * 100) / Dimensions.get('window').height;
    if (snap1 < 1) {
      snap1 = 1;
    }
    let snap2: number = 80;
    if (snap1 < 80) {
      snap2 = snap1 + 20;
    }
    return [`${snap1}%`, `${snap2}%`];
  }, [heightLayout]);

  const hide = useCallback(() => {
    setSheetType(null);
    Keyboard.dismiss();
    bottomSheetRef.current?.snapToIndex(-1);
    bottomSheetRef.current?.close();
    setIndexBottomSheet(-1);
    setHeightLayout(10);
  }, []);

  const handleSheetChanges = useCallback((ind: number) => {
    //console.log('&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& handleSheetChanges', ind);
    setIndexBottomSheet(ind);
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        if (indexBottomSheet > -1) {
          bottomSheetRef.current?.snapToIndex(1);
          setIndexBottomSheet(1);
        }
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        if (indexBottomSheet > -1) {
          bottomSheetRef.current?.snapToIndex(0);
          setIndexBottomSheet(0);
        }
      },
    );

    return () => {
      !!keyboardDidShowListener && keyboardDidShowListener.remove();
      !!keyboardDidHideListener && keyboardDidHideListener.remove();
    };
  }, [indexBottomSheet]);

  useEffect(() => {
    if (addresses && addresses.length > 0) {
      console.log('addresses', addresses);

      // we offering now two types:
      // 1. UA
      // 2. T
      const uAdd =
        addresses.filter(
          (a: UnifiedAddressClass | TransparentAddressClass) =>
            a.addressKind === AddressKindEnum.u,
        ) || [];
      // we are filtering only the `external` addresses... for now.
      const tAdd =
        addresses.filter(
          (a: UnifiedAddressClass | TransparentAddressClass) =>
            a.addressKind === AddressKindEnum.t &&
            a.scope === RPCAddressScopeEnum.external,
        ) || [];
      setUAddr(uAdd as UnifiedAddressClass[]);
      setTAddr(tAdd as TransparentAddressClass[]);
      // the first address of the list
      setUAddrIndex(0);
      setTAddrIndex(0);
    }
  }, [addresses]);

  useEffect(() => {
    const advancedModeRoutes = [
      { key: 'uaddr', title: translate('receive.u-title') as string },
    ];
    setRoutes(advancedModeRoutes);
  }, [translate]);

  const renderScene: (
    props: SceneRendererProps & {
      route: Route;
    },
  ) => ReactNode = ({ route }) => {
    let component: React.ReactNode;
    switch (route.key) {
      case 'uaddr': {
        let uAddress = new UnifiedAddressClass(
          0,
          translate('receive.noaddress') as string,
          AddressKindEnum.u,
          false,
          false,
          false,
        );
        if (uAddrIndex !== null && uAddr.length > 0) {
          uAddress = uAddr[uAddrIndex];
        }

        component = (
          <>
            {!!addresses && !!defaultUnifiedAddress && (
              <ReceiveAddressCard
                address={uAddress}
                screenName={screenName}
                onChangeTab={setIndex}
              />
            )}
          </>
        );
        break;
      }
    }
    return (
      <>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scene,
            { paddingBottom: insets.bottom + space.sm },
          ]}
        >
          <View style={styles.center}>{component}</View>
        </ScrollView>
      </>
    );
  };

  const renderTabBarPage: (
    props: SceneRendererProps & {
      navigationState: NavigationState<Route>;
    },
  ) => ReactNode = () => {
    return (
      <HeaderTitle
        title="Receive"
        goBack={() => {
          clear();
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
      />
    );
  };

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      pressBehavior="close"
    />
  );

  const returnPage = (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        renderTabBar={renderTabBarPage}
        onIndexChange={setIndex}
        swipeEnabled={false}
      />
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        onChange={handleSheetChanges}
        enablePanDownToClose
        keyboardBehavior={'interactive'}
        handleStyle={styles.sheetHandle}
        backgroundStyle={{ backgroundColor: colors.bgCanvas }}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView
          style={[styles.sheetContent, { backgroundColor: colors.bgCanvas }]}
        >
          {sheetType === 'NA' && (
            <NewAddress
              addressKind={index === 0 ? AddressKindEnum.u : AddressKindEnum.t}
              closeSheet={hide}
              screenName={screenName}
              setHeightLayout={setHeightLayout}
            />
          )}
          {sheetType === 'VA' && (
            <VerifyAddress
              closeSheet={hide}
              screenName={screenName}
              setHeightLayout={setHeightLayout}
            />
          )}
          {sheetType === 'TW' && (
            <TransparentWarning
              closeSheet={hide}
              onSuccess={() => {
                setIndex(1);
              }}
              setHeightLayout={setHeightLayout}
            />
          )}
        </BottomSheetView>
      </BottomSheet>
    </ToastProvider>
  );

  //console.log('render Receive - 4', uAddr, uAddrIndex, tAddr, tAddrIndex, defaultUnifiedAddress);

  return returnPage;
};

const styles = StyleSheet.create({
  scene: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
  },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHandle: {
    display: 'none',
  },
  sheetContent: {
    height: '100%',
  },
});

export default Receive;
