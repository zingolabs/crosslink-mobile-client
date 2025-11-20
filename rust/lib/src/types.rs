use zcash_protocol::consensus::BlockHeight;
use zingolib::wallet::summary::data::ValueTransfer;

#[derive(Debug, Clone, uniffi::Record)]
pub struct WalletHeight {
    pub height: u32,
}

impl From<BlockHeight> for WalletHeight {
    fn from(block_height: BlockHeight) -> Self {
        WalletHeight {
            height: block_height.into(),
        }
    }
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct ValueTransferInfo {
    pub txid: String,
    pub datetime: String,
    pub status: String,
    pub blockheight: u64,

    // For these, start with String and tighten types later
    pub transaction_fee: Option<u64>,
    pub zec_price: Option<f32>,
    pub kind: String,
    pub value: String,

    pub recipient_address: Option<String>,
    pub pool_received: Option<String>,
    pub memos: Vec<String>,
}

impl From<&ValueTransfer> for ValueTransferInfo {
    fn from(vt: &ValueTransfer) -> Self {
        ValueTransferInfo {
            txid: vt.txid.to_string(),
            datetime: vt.datetime.to_string(),
            status: vt.status.to_string(),
            blockheight: u64::from(vt.blockheight),

            transaction_fee: vt.transaction_fee,
            zec_price: vt.zec_price,
            kind: vt.kind.to_string(),
            value: vt.value.to_string(),

            recipient_address: vt.recipient_address.clone(),
            pool_received: vt.pool_received.clone(),

            memos: vt.memos.iter().map(|m| m.to_string()).collect(),
        }
    }
}

#[derive(Debug, Clone, uniffi::Enum)]
pub enum WalletKind {
    /// Wallet has a mnemonic (seed phrase)
    SeedOrMnemonic,

    /// Wallet was loaded from a unified spending key
    UnifiedSpendingKey,

    /// Wallet was loaded from a unified full viewing key
    UnifiedFullViewingKey,

    /// No keys found for the given account
    NoKeys,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct WalletPools {
    pub transparent: bool,
    pub sapling: bool,
    pub orchard: bool,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct WalletKindInfo {
    pub kind: WalletKind,
    pub pools: WalletPools,
}
