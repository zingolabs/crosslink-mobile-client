/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { View, ViewProps } from 'react-native';

/**
 * Web stub for @gorhom/bottom-sheet.
 *
 * The real library runs its animation on the UI thread through Reanimated
 * worklets, which do not exist on web. This renders the sheet inline, docked to
 * the bottom, and honours `snapToIndex` / `close` so stories can still drive it.
 */
export type BottomSheetMethods = {
  snapToIndex: (i: number) => void;
  expand: () => void;
  collapse: () => void;
  close: () => void;
  forceClose: () => void;
};

type BottomSheetProps = ViewProps & {
  index?: number;
  onChange?: (index: number) => void;
  backdropComponent?: React.ComponentType<BottomSheetBackdropProps>;
};

const BottomSheet = forwardRef<BottomSheetMethods, BottomSheetProps>(
  ({ index = -1, onChange, children, style, ...rest }, ref) => {
    const [current, setCurrent] = useState(index);

    const go = (i: number) => {
      setCurrent(i);
      onChange?.(i);
    };

    useImperativeHandle(ref, () => ({
      snapToIndex: go,
      expand: () => go(0),
      collapse: () => go(0),
      close: () => go(-1),
      forceClose: () => go(-1),
    }));

    if (current < 0) {
      return null;
    }

    return (
      <View
        {...rest}
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: '85%',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            backgroundColor: '#1e293b',
            overflow: 'hidden',
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  },
);

BottomSheet.displayName = 'BottomSheetStub';

export type BottomSheetBackdropProps = ViewProps & {
  animatedIndex?: unknown;
  animatedPosition?: unknown;
};

export const BottomSheetBackdrop: React.FC<BottomSheetBackdropProps> = ({
  style,
  ...rest
}) => (
  <View
    {...rest}
    style={[style, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
    pointerEvents="none"
  />
);

export const BottomSheetView: React.FC<ViewProps> = ({ children, ...rest }) => (
  <View {...rest}>{children}</View>
);

export const BottomSheetModal = BottomSheet;
export const BottomSheetModalProvider: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => <>{children}</>;
export const BottomSheetScrollView: React.FC<ViewProps> = ({
  children,
  ...rest
}) => <View {...rest}>{children}</View>;

export default BottomSheet;
