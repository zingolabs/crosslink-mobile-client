use serde::{Deserialize, Serialize};
use ts_rs::TS;

use pepper_sync::keys::transparent::TransparentScope;
use pepper_sync::sync::ScanPriority;
use zcash_client_backend::proto::service::LightdInfo;
use zcash_primitives::transaction::{StakingAction, StakingActionKind};
use zingo_status::confirmation_status::ConfirmationStatus;
use zingolib::crosslink::{action_target_address, encode_finalizer_address, finalizer_pubkey_hex};
use zingolib::lightclient::crosslink::{
    RosterMembers, WalletBond as ZingoWalletBond, WalletBonds as ZingoWalletBonds,
};
use zingolib::perspective::sync_progress::{SessionReport, SyncProgress};
use zingolib::wallet::RecoveryInfo;
use zingolib::wallet::balance::AccountBalance;
use zingolib::wallet::disk::WalletFileRecoveryInfo as ZingoWalletFileRecoveryInfo;
use zingolib::wallet::keys::WalletAddressRef;
use zingolib::wallet::summary::data::{
    SelfSendWalletEvent, SentWalletEvent, WalletEvent, WalletEventKind, WalletEvents,
};

pub fn to_json<T: Serialize>(value: &T) -> String {
    serde_json::to_string(value).unwrap_or_else(|e| format!("Error: serializing payload: {e}"))
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct WalletInfo {
    pub version: String,
    pub git_commit: String,
    pub indexer_uri: String,
    pub vendor: String,
    pub taddr_support: bool,
    pub chain_name: String,
    pub sapling_activation_height: u64,
    pub consensus_branch_id: String,
    pub latest_block_height: u64,
}

impl WalletInfo {
    pub fn new(info: LightdInfo, indexer_uri: String) -> Self {
        Self {
            version: info.version,
            git_commit: info.git_commit,
            indexer_uri,
            vendor: info.vendor,
            taddr_support: info.taddr_support,
            chain_name: info.chain_name,
            sapling_activation_height: info.sapling_activation_height,
            consensus_branch_id: info.consensus_branch_id,
            latest_block_height: info.block_height,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Balance {
    pub confirmed_ironwood_balance: Option<u64>,
    pub unconfirmed_ironwood_balance: Option<u64>,
    pub total_ironwood_balance: Option<u64>,
    pub confirmed_orchard_balance: Option<u64>,
    pub unconfirmed_orchard_balance: Option<u64>,
    pub total_orchard_balance: Option<u64>,
    pub confirmed_sapling_balance: Option<u64>,
    pub unconfirmed_sapling_balance: Option<u64>,
    pub total_sapling_balance: Option<u64>,
    pub confirmed_transparent_balance: Option<u64>,
    pub unconfirmed_transparent_balance: Option<u64>,
    pub total_transparent_balance: Option<u64>,
    pub staked_amount: u64,
}

impl From<AccountBalance> for Balance {
    fn from(balance: AccountBalance) -> Self {
        let zats = |value: Option<zcash_protocol::value::Zatoshis>| value.map(|z| z.into_u64());
        Self {
            confirmed_ironwood_balance: zats(balance.confirmed_ironwood_balance),
            unconfirmed_ironwood_balance: zats(balance.unconfirmed_ironwood_balance),
            total_ironwood_balance: zats(balance.total_ironwood_balance),
            confirmed_orchard_balance: zats(balance.confirmed_orchard_balance),
            unconfirmed_orchard_balance: zats(balance.unconfirmed_orchard_balance),
            total_orchard_balance: zats(balance.total_orchard_balance),
            confirmed_sapling_balance: zats(balance.confirmed_sapling_balance),
            unconfirmed_sapling_balance: zats(balance.unconfirmed_sapling_balance),
            total_sapling_balance: zats(balance.total_sapling_balance),
            confirmed_transparent_balance: zats(balance.confirmed_transparent_balance),
            unconfirmed_transparent_balance: zats(balance.unconfirmed_transparent_balance),
            total_transparent_balance: zats(balance.total_transparent_balance),
            staked_amount: balance.staked_amount.into_u64(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SpendableBalance {
    pub spendable_balance: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum WalletKeyKind {
    #[serde(rename = "Loaded from seed or mnemonic phrase")]
    SeedPhrase,
    #[serde(rename = "Loaded from unified spending key")]
    UnifiedSpendingKey,
    #[serde(rename = "Loaded from unified full viewing key")]
    UnifiedFullViewingKey,
    #[serde(rename = "No keys found")]
    NoKeysFound,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct WalletKind {
    pub kind: WalletKeyKind,
    pub transparent: bool,
    pub sapling: bool,
    pub orchard: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum ValueTransferStatus {
    Calculated,
    Transmitted,
    Mempool,
    Confirmed,
    Failed,
}

impl From<ConfirmationStatus> for ValueTransferStatus {
    fn from(status: ConfirmationStatus) -> Self {
        match status {
            ConfirmationStatus::Calculated(_) => Self::Calculated,
            ConfirmationStatus::Transmitted(_) => Self::Transmitted,
            ConfirmationStatus::Mempool(_) => Self::Mempool,
            ConfirmationStatus::Confirmed(_) => Self::Confirmed,
            ConfirmationStatus::Failed(_) => Self::Failed,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "kebab-case")]
pub enum ValueTransferKind {
    Sent,
    Received,
    SendToSelf,
    Shield,
    MemoToSelf,
    Rejection,
    CreateBond,
    BeginUnbond,
    WithdrawBond,
    RetargetDelegationBond,
}

impl From<WalletEventKind> for ValueTransferKind {
    fn from(kind: WalletEventKind) -> Self {
        match kind {
            WalletEventKind::Received => Self::Received,
            WalletEventKind::Sent(SentWalletEvent::Send) => Self::Sent,
            WalletEventKind::Sent(SentWalletEvent::SendToSelf(self_send)) => match self_send {
                SelfSendWalletEvent::Basic => Self::SendToSelf,
                SelfSendWalletEvent::Shield => Self::Shield,
                SelfSendWalletEvent::MemoToSelf => Self::MemoToSelf,
                SelfSendWalletEvent::Refund => Self::Rejection,
                SelfSendWalletEvent::Stake => Self::CreateBond,
                SelfSendWalletEvent::BeginUnbond => Self::BeginUnbond,
                SelfSendWalletEvent::WithdrawBond => Self::WithdrawBond,
                SelfSendWalletEvent::RetargetDelegationBond => Self::RetargetDelegationBond,
            },
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum StakingKind {
    #[serde(rename = "create_bond")]
    CreateBond,
    #[serde(rename = "begin_unbonding")]
    BeginUnbonding,
    #[serde(rename = "withdraw_bond")]
    WithdrawBond,
    #[serde(rename = "move")]
    Move,
    #[serde(rename = "null")]
    Null,
    #[serde(rename = "FINALIZER_convert_reward_to_bond")]
    ConvertFinalizerRewardToBond,
}

impl From<StakingActionKind> for StakingKind {
    fn from(kind: StakingActionKind) -> Self {
        match kind {
            StakingActionKind::CreateNewDelegationBond => Self::CreateBond,
            StakingActionKind::BeginDelegationUnbonding => Self::BeginUnbonding,
            StakingActionKind::WithdrawDelegationBond => Self::WithdrawBond,
            StakingActionKind::RetargetDelegationBond => Self::Move,
            StakingActionKind::Null => Self::Null,
            StakingActionKind::ConvertFinalizerRewardToDelegationBond => {
                Self::ConvertFinalizerRewardToBond
            }
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct StakingActionPayload {
    pub kind: StakingKind,
    pub val: u64,
    pub target: String,
    pub target_address: Option<String>,
    pub unique_public_key: String,
}

impl From<StakingAction> for StakingActionPayload {
    fn from(action: StakingAction) -> Self {
        let mut reversed_target = action.target_finalizer_pk();
        reversed_target.reverse();
        Self {
            kind: action.kind().into(),
            val: action.amount_zats(),
            target: hex::encode(reversed_target),
            target_address: action_target_address(&action).map(|address| address.encode()),
            unique_public_key: hex::encode(action.unique_pubkey()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ValueTransfer {
    pub txid: String,
    pub datetime: u32,
    pub status: ValueTransferStatus,
    pub blockheight: u64,
    pub transaction_fee: Option<u64>,
    pub zec_price: Option<f32>,
    pub kind: ValueTransferKind,
    pub value: u64,
    pub recipient_address: Option<String>,
    pub pool_received: Option<String>,
    pub memos: Vec<String>,
    pub staking_action: Option<StakingActionPayload>,
}

impl From<WalletEvent> for ValueTransfer {
    fn from(event: WalletEvent) -> Self {
        Self {
            txid: event.txid.to_string(),
            datetime: event.datetime,
            status: event.status.into(),
            blockheight: u64::from(event.blockheight),
            transaction_fee: event.transaction_fee,
            zec_price: event.zec_price,
            kind: event.kind.into(),
            value: event.value,
            recipient_address: event.recipient_address,
            pool_received: event.pool_received,
            memos: event.memos,
            staking_action: event.staking_action.map(Into::into),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ValueTransfers {
    pub wallet_events: Vec<ValueTransfer>,
}

impl From<WalletEvents> for ValueTransfers {
    fn from(events: WalletEvents) -> Self {
        Self {
            wallet_events: events.iter().cloned().map(Into::into).collect(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum ScanRangePriority {
    RefetchingNullifiers,
    Scanning,
    Scanned,
    ScannedWithoutMapping,
    Historic,
    OpenAdjacent,
    FoundNote,
    ChainTip,
    Verify,
}

impl From<ScanPriority> for ScanRangePriority {
    fn from(priority: ScanPriority) -> Self {
        match priority {
            ScanPriority::RefetchingNullifiers => Self::RefetchingNullifiers,
            ScanPriority::Scanning => Self::Scanning,
            ScanPriority::Scanned => Self::Scanned,
            ScanPriority::ScannedWithoutMapping => Self::ScannedWithoutMapping,
            ScanPriority::Historic => Self::Historic,
            ScanPriority::OpenAdjacent => Self::OpenAdjacent,
            ScanPriority::FoundNote => Self::FoundNote,
            ScanPriority::ChainTip => Self::ChainTip,
            ScanPriority::Verify => Self::Verify,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ScanRange {
    pub priority: ScanRangePriority,
    pub start_block: String,
    pub end_block: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SyncStatus {
    pub scan_ranges: Vec<ScanRange>,
    pub sync_start_height: u32,
    pub session_blocks_scanned: u32,
    pub total_blocks_scanned: u32,
    pub total_blocks: u32,
    pub percentage_total_blocks_scanned: f32,
    pub session_sapling_outputs_scanned: u32,
    pub total_sapling_outputs_scanned: u32,
    pub session_orchard_outputs_scanned: u32,
    pub total_orchard_outputs_scanned: u32,
    pub session_ironwood_outputs_scanned: u32,
    pub total_ironwood_outputs_scanned: u32,
    pub percentage_total_outputs_scanned: f32,
    pub total_outputs_scanned: u64,
    pub total_outputs: u64,
}

impl From<SyncProgress> for SyncStatus {
    fn from(progress: SyncProgress) -> Self {
        let status = progress.status;
        Self {
            scan_ranges: status
                .scan_ranges
                .iter()
                .map(|range| ScanRange {
                    priority: range.priority().into(),
                    start_block: range.block_range().start.to_string(),
                    end_block: (range.block_range().end - 1).to_string(),
                })
                .collect(),
            sync_start_height: u32::from(status.sync_start_height),
            session_blocks_scanned: status.session_blocks_scanned,
            total_blocks_scanned: status.total_blocks_scanned,
            total_blocks: status.total_blocks,
            percentage_total_blocks_scanned: progress.percentage_total_blocks_scanned,
            session_sapling_outputs_scanned: status.session_sapling_outputs_scanned,
            total_sapling_outputs_scanned: status.total_sapling_outputs_scanned,
            session_orchard_outputs_scanned: status.session_orchard_outputs_scanned,
            total_orchard_outputs_scanned: status.total_orchard_outputs_scanned,
            session_ironwood_outputs_scanned: status.session_ironwood_outputs_scanned,
            total_ironwood_outputs_scanned: status.total_ironwood_outputs_scanned,
            percentage_total_outputs_scanned: progress.percentage_total_outputs_scanned,
            total_outputs_scanned: status.total_outputs_scanned,
            total_outputs: status.total_outputs,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SyncSession {
    pub sync_start_height: u32,
    pub sync_end_height: u32,
    pub blocks_scanned: u32,
    pub sapling_outputs_scanned: u32,
    pub orchard_outputs_scanned: u32,
    pub ironwood_outputs_scanned: u32,
    pub percentage_total_outputs_scanned: f32,
    pub total_outputs_scanned: u64,
    pub total_outputs: u64,
}

impl From<SessionReport> for SyncSession {
    fn from(report: SessionReport) -> Self {
        let result = report.result;
        Self {
            sync_start_height: u32::from(result.sync_start_height),
            sync_end_height: u32::from(result.sync_end_height),
            blocks_scanned: result.blocks_scanned,
            sapling_outputs_scanned: result.sapling_outputs_scanned,
            orchard_outputs_scanned: result.orchard_outputs_scanned,
            ironwood_outputs_scanned: result.ironwood_outputs_scanned,
            percentage_total_outputs_scanned: report.percentage_total_outputs_scanned,
            total_outputs_scanned: result.total_outputs_scanned,
            total_outputs: result.total_outputs,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SyncPoll {
    pub sync_complete: SyncSession,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct UnifiedAddress {
    pub account: u32,
    pub address_index: u32,
    pub has_orchard: bool,
    pub has_sapling: bool,
    pub has_transparent: bool,
    pub encoded_address: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum AddressScope {
    External,
    Internal,
    Refund,
}

impl From<TransparentScope> for AddressScope {
    fn from(scope: TransparentScope) -> Self {
        match scope {
            TransparentScope::External => Self::External,
            TransparentScope::Internal => Self::Internal,
            TransparentScope::Refund => Self::Refund,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct TransparentAddress {
    pub account: u32,
    pub address_index: u32,
    pub scope: AddressScope,
    pub encoded_address: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct RosterStake {
    pub txid: String,
    pub accumulated_zats: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct RosterMember {
    pub pubkey: String,
    pub finalizer_address: Option<String>,
    pub voting_power: u64,
    pub txids: Vec<RosterStake>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Roster {
    pub roster_members: Vec<RosterMember>,
}

impl From<RosterMembers> for Roster {
    fn from(roster: RosterMembers) -> Self {
        Self {
            roster_members: roster
                .members
                .into_iter()
                .map(|member| RosterMember {
                    pubkey: finalizer_pubkey_hex(&member.pub_key),
                    finalizer_address: member
                        .finalizer_address
                        .as_ref()
                        .map(encode_finalizer_address),
                    voting_power: member.voting_power,
                    txids: member
                        .txids
                        .into_iter()
                        .map(|entry| RosterStake {
                            txid: hex::encode(entry.txid),
                            accumulated_zats: entry.zats,
                        })
                        .collect(),
                })
                .collect(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct WalletBond {
    pub created_in_txid: String,
    pub bond_key: String,
    pub amount_zats: u64,
    pub status: u32,
    pub status_name: String,
    pub last_action_height: Option<u32>,
    pub next_action_height: Option<u32>,
    pub finalizer: String,
    pub finalizer_address: Option<String>,
}

impl From<ZingoWalletBond> for WalletBond {
    fn from(bond: ZingoWalletBond) -> Self {
        Self {
            created_in_txid: bond.created_in_txid.to_string(),
            bond_key: hex::encode(bond.pubkey),
            amount_zats: bond.amount_zats,
            status: bond.status.wire(),
            status_name: bond.status.to_string(),
            last_action_height: bond.last_action_height,
            next_action_height: bond.next_action_height,
            finalizer: hex::encode(bond.finalizer),
            finalizer_address: bond
                .finalizer_address
                .as_ref()
                .map(encode_finalizer_address),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct WalletBonds {
    pub bonds: Vec<WalletBond>,
}

impl From<ZingoWalletBonds> for WalletBonds {
    fn from(bonds: ZingoWalletBonds) -> Self {
        Self {
            bonds: bonds.bonds.into_iter().map(Into::into).collect(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct WalletVersion {
    pub current_version: u64,
    pub read_version: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Seed {
    pub seed_phrase: String,
    pub birthday: u64,
    pub no_of_accounts: u32,
}

impl From<RecoveryInfo> for Seed {
    fn from(info: RecoveryInfo) -> Self {
        Self {
            seed_phrase: info.seed_phrase,
            birthday: info.birthday,
            no_of_accounts: info.no_of_accounts,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct WalletFileRecoveryInfo {
    pub seed_phrase: Option<String>,
    pub ufvk: Option<String>,
    pub birthday: u32,
    pub chain_name: String,
    pub format_version: u64,
}

impl From<ZingoWalletFileRecoveryInfo> for WalletFileRecoveryInfo {
    fn from(info: ZingoWalletFileRecoveryInfo) -> Self {
        Self {
            seed_phrase: info.seed_phrase,
            ufvk: info.unified_full_viewing_key,
            birthday: info.birthday,
            chain_name: info.chain_name,
            format_version: info.version,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Ufvk {
    pub ufvk: String,
    pub birthday: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct WalletHeight {
    pub height: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum PerformanceLevel {
    Low,
    Medium,
    High,
    Maximum,
}

impl From<pepper_sync::config::PerformanceLevel> for PerformanceLevel {
    fn from(level: pepper_sync::config::PerformanceLevel) -> Self {
        match level {
            pepper_sync::config::PerformanceLevel::Low => Self::Low,
            pepper_sync::config::PerformanceLevel::Medium => Self::Medium,
            pepper_sync::config::PerformanceLevel::High => Self::High,
            pepper_sync::config::PerformanceLevel::Maximum => Self::Maximum,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ConfigWalletPerformance {
    pub performance_level: PerformanceLevel,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ZecPrice {
    pub current_price: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct WalletSaveRequired {
    pub save_required: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum ParseAddressStatus {
    #[serde(rename = "success")]
    Success,
    #[serde(rename = "Invalid address")]
    Invalid,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum ChainName {
    Main,
    Test,
    Regtest,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum AddressKind {
    Unified,
    Sapling,
    Transparent,
    Tex,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum Receiver {
    Orchard,
    Sapling,
    Transparent,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ParseAddress {
    pub status: ParseAddressStatus,
    pub chain_name: Option<ChainName>,
    pub address_kind: Option<AddressKind>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub receivers_available: Option<Vec<Receiver>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub only_orchard_ua: Option<String>,
}

impl ParseAddress {
    pub fn invalid() -> Self {
        Self {
            status: ParseAddressStatus::Invalid,
            chain_name: None,
            address_kind: None,
            receivers_available: None,
            only_orchard_ua: None,
        }
    }

    pub fn valid(chain_name: ChainName, address_kind: AddressKind) -> Self {
        Self {
            status: ParseAddressStatus::Success,
            chain_name: Some(chain_name),
            address_kind: Some(address_kind),
            receivers_available: None,
            only_orchard_ua: None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum CheckAddressKind {
    Unified,
    OrchardInternal,
    Sapling,
    Transparent,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[ts(optional_fields)]
pub struct CheckAddress {
    pub is_wallet_address: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address_type: Option<CheckAddressKind>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub account_id: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address_index: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub has_orchard: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub has_sapling: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub has_transparent: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub diversifier_index: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<AddressScope>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub encoded_address: Option<String>,
}

impl CheckAddress {
    fn foreign() -> Self {
        Self {
            is_wallet_address: false,
            address_type: None,
            account_id: None,
            address_index: None,
            has_orchard: None,
            has_sapling: None,
            has_transparent: None,
            diversifier_index: None,
            scope: None,
            encoded_address: None,
        }
    }
}

impl From<Option<WalletAddressRef>> for CheckAddress {
    fn from(address: Option<WalletAddressRef>) -> Self {
        let Some(address) = address else {
            return Self::foreign();
        };
        let owned = Self {
            is_wallet_address: true,
            ..Self::foreign()
        };
        match address {
            WalletAddressRef::Unified {
                account_id,
                address_index,
                has_orchard,
                has_sapling,
                has_transparent,
                encoded_address,
            } => Self {
                address_type: Some(CheckAddressKind::Unified),
                account_id: Some(u32::from(account_id)),
                address_index,
                has_orchard: Some(has_orchard),
                has_sapling: Some(has_sapling),
                has_transparent: Some(has_transparent),
                encoded_address: Some(encoded_address),
                ..owned
            },
            WalletAddressRef::OrchardInternal {
                account_id,
                diversifier_index,
                encoded_address,
            } => Self {
                address_type: Some(CheckAddressKind::OrchardInternal),
                account_id: Some(u32::from(account_id)),
                diversifier_index: Some(u128::from(diversifier_index).to_string()),
                encoded_address: Some(encoded_address),
                ..owned
            },
            WalletAddressRef::SaplingExternal {
                account_id,
                diversifier_index,
                encoded_address,
            } => Self {
                address_type: Some(CheckAddressKind::Sapling),
                account_id: Some(u32::from(account_id)),
                diversifier_index: Some(u128::from(diversifier_index).to_string()),
                encoded_address: Some(encoded_address),
                ..owned
            },
            WalletAddressRef::Transparent {
                account_id,
                scope,
                address_index,
                encoded_address,
            } => Self {
                address_type: Some(CheckAddressKind::Transparent),
                account_id: Some(u32::from(account_id)),
                scope: Some(scope.into()),
                address_index: Some(address_index.index()),
                encoded_address: Some(encoded_address),
                ..owned
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[ts(optional_fields)]
pub struct Propose {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fee: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl Propose {
    pub fn fee(fee: u64) -> Self {
        Self {
            fee: Some(fee),
            error: None,
        }
    }

    pub fn error(error: impl ToString) -> Self {
        Self {
            fee: None,
            error: Some(error.to_string()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[ts(optional_fields)]
pub struct Confirm {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub txids: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl Confirm {
    pub fn txids(txids: Vec<String>) -> Self {
        Self {
            txids: Some(txids),
            error: None,
        }
    }

    pub fn error(error: impl ToString) -> Self {
        Self {
            txids: None,
            error: Some(error.to_string()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[ts(optional_fields)]
pub struct WithdrawStake {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub txid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl WithdrawStake {
    pub fn txid(txid: impl ToString) -> Self {
        Self {
            txid: Some(txid.to_string()),
            error: None,
        }
    }

    pub fn error(error: impl ToString) -> Self {
        Self {
            txid: None,
            error: Some(error.to_string()),
        }
    }
}
