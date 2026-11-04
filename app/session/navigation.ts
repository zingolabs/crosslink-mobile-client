import { createNavigationContainerRef } from '@react-navigation/native';

import { RouteEnum } from '../AppState';
import { SessionStackParamList } from '../types';

export const navigationRef =
  createNavigationContainerRef<SessionStackParamList>();

export const navigateTo = <RouteName extends keyof SessionStackParamList>(
  screen: RouteName,
  params?: SessionStackParamList[RouteName],
): void => {
  (navigationRef.navigate as (...args: unknown[]) => void)(screen, params);
};

export const openScheduledTab = (): void =>
  navigateTo(RouteEnum.MainTabs, {
    screen: RouteEnum.StakingHome,
    params: { tab: 'scheduled' },
  });

export const currentRoute = () => navigationRef.getCurrentRoute();
