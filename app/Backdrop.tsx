import React, { createContext, useContext, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from './theme';

type BackdropSetter = (node: React.ReactNode) => void;

const BackdropContext = createContext<BackdropSetter | null>(null);

export const useBackdropSetter = () => useContext(BackdropContext);

export const BackdropHost: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [node, setNode] = useState<React.ReactNode>(null);
  const { colors } = useTheme();
  return (
    <BackdropContext.Provider value={setNode}>
      <View style={[styles.fill, { backgroundColor: colors.bgCanvas }]}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {node}
        </View>
        {children}
      </View>
    </BackdropContext.Provider>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
