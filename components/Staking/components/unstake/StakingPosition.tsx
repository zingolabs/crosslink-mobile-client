/* eslint-disable react-native/no-inline-styles */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CurrencyNameEnum, WalletBondsType } from '../../../../app/AppState';
import { WalletBondsStatusEnum } from '../../../../app/AppState/enums/WalletBondsStatusEnum';
import { RefreshCcw } from 'lucide-react-native';
import ZecAmount from '../../../Components/ZecAmount';
import { useAppLoadedWallet } from '../../../../app/context';
import { useTheme } from '../../../../app/theme';

type StakingPositionProps = {
  item: WalletBondsType;
  selected: boolean;
};

export function StakingPosition({ item, selected }: StakingPositionProps) {
  const { colors } = useTheme();
  const { valueTransfers } = useAppLoadedWallet();

  let confirmations =
    valueTransfers &&
    valueTransfers.filter(v => v.txid === item.txid).length > 0
      ? valueTransfers.filter(v => v.txid === item.txid)[0].confirmations
      : 0;

  return (
    <Pressable
      onPress={() => {
        //setSelectedTxid(item.txid);
      }}
      style={[
        styles.txRow,
        {
          borderColor: selected ? colors.borderAccent : colors.borderFaint,
          backgroundColor: selected ? colors.bgSurface : colors.bgCanvas,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {!confirmations && (
            <RefreshCcw width={15} height={15} style={{ marginRight: 5 }} />
          )}
          <Text
            style={{
              color: colors.fgDefault,
              fontSize: 13,
              fontWeight: '500',
            }}
            numberOfLines={1}
          >
            {item.status === WalletBondsStatusEnum.Unbonding
              ? 'Inactive'
              : item.status}
          </Text>
        </View>
        <Text
          style={{
            color: colors.fgSubtle,
            fontSize: 11,
            marginTop: 2,
          }}
        >
          {shortenTxid(item.pubKey)}
        </Text>
      </View>
      <ZecAmount
        style={{
          alignSelf: 'center',
          marginLeft: 12,
        }}
        size={14}
        currencyName={CurrencyNameEnum.cTAZ}
        color={colors.fgDefault}
        amtZec={item.amount}
        privacy={false}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '80%',
    maxWidth: 320,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});

const shortenTxid = (txid: string) => {
  if (txid.length <= 16) {
    return txid;
  }
  return `${txid.slice(0, 10)}…${txid.slice(-8)}`;
};
