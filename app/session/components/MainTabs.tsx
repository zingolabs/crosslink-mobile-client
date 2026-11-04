import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { MainTabParamList } from '../../types';
import { RouteEnum } from '../../AppState';
import StakingScreen from '../../../components/Staking/Staking';
import History from '../../../components/History';
import { Platform } from 'react-native';
import { useTheme } from '../../theme';
import { ScreenErrorBoundary } from '../../ErrorBoundary';

const Tab = createNativeBottomTabNavigator<MainTabParamList>();

type MainTabsProps = {
  scrollToTop: boolean;
  setScrollToTop: (value: boolean) => void;
  setScrollToBottom: (value: boolean) => void;
  setShieldingAmount: (value: number) => void;
};

export const MainTabs: React.FunctionComponent<MainTabsProps> = ({
  scrollToTop,
  setScrollToTop,
  setScrollToBottom,
  setShieldingAmount,
}) => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.fgMuted,
        sceneStyle: { backgroundColor: colors.bgCanvas },
      }}
      tabBarStyle={{
        backgroundColor: colors.bgCanvas,
      }}
    >
      <Tab.Screen
        name={RouteEnum.History}
        options={{
          title: 'Home',
          tabBarIcon: () =>
            Platform.select({
              ios: { sfSymbol: 'house' },
              android: require('../../../assets/icons/house.png'),
            }),
          tabBarActiveTintColor: colors.fgAccent,
        }}
      >
        {props => (
          <ScreenErrorBoundary>
            <History
              {...props}
              setShieldingAmount={setShieldingAmount}
              setScrollToTop={setScrollToTop}
              scrollToTop={scrollToTop}
              setScrollToBottom={setScrollToBottom}
            />
          </ScreenErrorBoundary>
        )}
      </Tab.Screen>

      <Tab.Screen
        name={RouteEnum.StakingHome}
        options={{
          title: 'Staking',
          lazy: false,
          tabBarIcon: () =>
            Platform.select({
              ios: { sfSymbol: 'square.stack.3d.up.fill' },
              android: require('../../../assets/icons/layers.png'),
            }),
          tabBarActiveTintColor: colors.fgAccent,
        }}
      >
        {props => (
          <ScreenErrorBoundary>
            <StakingScreen {...props} />
          </ScreenErrorBoundary>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
};
