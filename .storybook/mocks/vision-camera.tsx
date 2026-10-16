/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Text, View } from 'react-native';

export const Camera: React.FC<Record<string, unknown>> = () => (
  <View
    style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#222',
    }}
  >
    <Text style={{ color: '#888' }}>[camera preview unavailable on web]</Text>
  </View>
);

export const useCameraDevice = () => ({ id: 'stub-back' });
export const useCameraDevices = () => [];
export const useCameraPermission = () => ({
  hasPermission: true,
  requestPermission: async () => true,
});
export const useCodeScanner = (o: unknown) => o;