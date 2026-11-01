import { NativeModules } from 'react-native';

import { FAKE_RPC } from '../config';

import fakeRpc from './fakeRpc';

const RPCModule = FAKE_RPC ? fakeRpc : NativeModules.RPCModule;

export default RPCModule;
