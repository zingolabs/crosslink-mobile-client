import React, { PropsWithChildren } from 'react';
import { ReactScan } from 'react-scan/native';

const ReactScanGate: React.FC<PropsWithChildren> = ({ children }) => (
  <ReactScan
    options={{
      enabled: true,
      log: false,
      animationWhenFlashing: 'fade-out',
    }}
  >
    {children}
  </ReactScan>
);

export default ReactScanGate;
