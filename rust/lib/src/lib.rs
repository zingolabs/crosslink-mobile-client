uniffi::setup_scaffolding!();

#[warn(unused)]
#[warn(missing_docs)]
#[macro_use]
extern crate lazy_static;
extern crate android_logger;

#[cfg(target_os = "android")]
use android_logger::{Config, FilterBuilder};
use hex::FromHex;
#[cfg(target_os = "android")]
use log::Level;
use zcash_protocol::memo::MemoBytes;
use zingo_netutils::discovery;
use zingo_netutils::get_client;
use zingolib::AccountId;

use std::any::Any;
use std::backtrace::Backtrace;
use std::num::NonZeroU32;
use std::panic::{self, PanicHookInfo, UnwindSafe};
use std::str::FromStr;
use std::sync::Mutex;
use std::sync::Once;
use std::sync::RwLock;

use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use bip0039::Mnemonic;
use json::{JsonValue, object};
use once_cell::sync::Lazy;
use rustls::crypto::{CryptoProvider, ring::default_provider};

use zcash_keys::address::Address;
use zcash_keys::keys::UnifiedFullViewingKey;
use zcash_protocol::consensus::BlockHeight;

use pepper_sync::config::{PerformanceLevel, SyncConfig, TransparentAddressDiscovery};
use pepper_sync::keys::transparent;
use pepper_sync::wallet::{KeyIdInterface, SyncMode};
use tokio::runtime::Runtime;
use zcash_address::ZcashAddress;
use zcash_protocol::value::Zatoshis;
use zingolib::config::{ChainType, ZingoConfig, chain_from_str, construct_lightwalletd_uri};
use zingolib::crosslink::{FinalizerAddress, parse_finalizer_address};
use zingolib::data::PollReport;
use zingolib::data::proposal::total_fee;
use zingolib::data::receivers::Receivers;
use zingolib::data::receivers::transaction_request_from_receivers;
use zingolib::lightclient::LightClient;
use zingolib::perspective::sync_progress::{SessionReport, SyncProgress};
use zingolib::utils::conversion::address_from_str;
use zingolib::wallet::keys::unified::{ReceiverSelection, UnifiedKeyStore};
use zingolib::wallet::{LightWallet, SeedDerivation, WalletBase, WalletSettings};

mod payloads;

use payloads::{
    AddressKind, Balance, ChainName, CheckAddress, ConfigWalletPerformance, Confirm, ParseAddress,
    Propose, Receiver, Roster, Seed, SpendableBalance, SyncPoll, SyncStatus, TransparentAddress,
    Ufvk, UnifiedAddress, ValueTransfers, WalletBonds, WalletHeight, WalletInfo, WalletKeyKind,
    WalletKind, WalletSaveRequired, WalletVersion, WithdrawStake, ZecPrice, to_json,
};

#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum ZingolibError {
    #[error("Error: Lightclient is not initialized")]
    LightclientNotInitialized,

    // Should be avoided
    #[error("Error: Lightclient lock poisoned")]
    LightclientLockPoisoned,

    // Should be avoided
    #[error("Error: panic: {0}")]
    Panic(String),
}

pub fn with_panic_guard<T, F>(f: F) -> Result<T, ZingolibError>
where
    F: FnOnce() -> Result<T, ZingolibError> + UnwindSafe,
{
    install_panic_hook_once();
    match panic::catch_unwind(f) {
        Ok(res) => res,
        Err(payload) => Err(ZingolibError::Panic(format_panic_text(payload))),
    }
}

#[derive(Clone, Default)]
struct PanicReport {
    msg: String,
    file: Option<String>,
    line: Option<u32>,
    col: Option<u32>,
    backtrace: Option<String>,
}

static LAST_PANIC: Lazy<Mutex<PanicReport>> = Lazy::new(|| Mutex::new(PanicReport::default()));

fn set_last_panic(report: PanicReport) {
    if let Ok(mut r) = LAST_PANIC.lock() {
        *r = report;
    }
}

fn take_last_panic() -> PanicReport {
    if let Ok(mut r) = LAST_PANIC.lock() {
        let out = r.clone();
        *r = PanicReport::default();
        out
    } else {
        PanicReport::default()
    }
}

static PANIC_HOOK_ONCE: Once = Once::new();

fn install_panic_hook_once() {
    PANIC_HOOK_ONCE.call_once(|| {
        panic::set_hook(Box::new(|info: &PanicHookInfo<'_>| {
            let payload = if let Some(s) = info.payload().downcast_ref::<&str>() {
                (*s).to_string()
            } else if let Some(s) = info.payload().downcast_ref::<String>() {
                s.clone()
            } else {
                info.to_string()
            };

            let (file, line, col) = info
                .location()
                .map(|l| (Some(l.file().to_string()), Some(l.line()), Some(l.column())))
                .unwrap_or((None, None, None));

            let bt = Backtrace::force_capture().to_string();

            set_last_panic(PanicReport {
                msg: payload,
                file,
                line,
                col,
                backtrace: Some(bt),
            });
        }));
    });
}

fn clean_backtrace(bt_raw: &str) -> String {
    const DROP: &[&str] = &["<unknown>"];

    let mut out = String::new();

    for line in bt_raw.lines() {
        let l = line.trim();
        if l.is_empty() {
            continue;
        }
        if DROP.iter().any(|d| l.contains(d)) {
            continue;
        }

        out.push_str(line);
        out.push('\n');
    }

    out
}

fn format_panic_text(payload: Box<dyn Any + Send>) -> String {
    let rpt = take_last_panic();

    let fallback = if let Some(s) = payload.downcast_ref::<&str>() {
        (*s).to_string()
    } else if let Some(s) = payload.downcast_ref::<String>() {
        s.clone()
    } else {
        "unknown panic payload".to_string()
    };

    let mut out = String::new();

    if let (Some(f), Some(l), Some(c)) = (rpt.file.as_ref(), rpt.line, rpt.col) {
        out.push_str(&format!("{f}:{l}:{c}: "));
    }
    if !rpt.msg.is_empty() {
        out.push_str(&rpt.msg);
    } else {
        out.push_str(&fallback);
    }

    if let Some(bt) = rpt.backtrace {
        let cleaned = clean_backtrace(&bt);
        if !cleaned.is_empty() {
            out.push_str("\nBacktrace:\n");
            out.push_str(&cleaned);
        }
    }

    out
}

// We'll use a RwLock to store a global lightclient instance,
// so we don't have to keep creating it. We need to store it here, in rust
// because we can't return such a complex structure back to JS
lazy_static! {
    static ref LIGHTCLIENT: RwLock<Option<LightClient>> = RwLock::new(None);
}

lazy_static! {
    pub static ref RT: Runtime = tokio::runtime::Runtime::new().unwrap();
}

/// Runs a closure with exclusive access to the global `LightClient` slot.
///
/// This helper is intended for operations that need `&mut LightClient`, such as
/// methods on `LightClient` that mutate internal client state directly, or for
/// replacing/removing the stored client itself.
///
/// Like `with_lightclient_read`, it also centralizes poison recovery and the
/// "not initialized" case so exported functions do not need to repeat that
/// boilerplate.
///
/// Use this for operations that need `&mut LightClient`.
fn with_lightclient_write<F, R>(f: F) -> R
where
    F: FnOnce(&mut Option<LightClient>) -> R,
{
    let mut guard = match LIGHTCLIENT.write() {
        Ok(g) => g,
        Err(poisoned) => {
            log::warn!("LIGHTCLIENT RwLock poisoned; recovering and clearing poison");
            let g = poisoned.into_inner();
            LIGHTCLIENT.clear_poison();
            g
        }
    };
    f(&mut guard)
}

/// Runs a closure with shared access to the global `LightClient`.
///
/// This helper centralizes three concerns that otherwise get duplicated across
/// many exported functions:
///
/// 1. Acquiring the global `LIGHTCLIENT` read lock.
/// 2. Recovering from a poisoned lock by taking the inner guard and clearing the
///    poison flag.
/// 3. Returning `ZingolibError::LightclientNotInitialized` when no client has
///    been stored yet.
///
/// Use this for operations that only need `&LightClient`.
fn with_lightclient_read<F, R>(f: F) -> Result<R, ZingolibError>
where
    F: FnOnce(&LightClient) -> Result<R, ZingolibError>,
{
    let guard = match LIGHTCLIENT.read() {
        Ok(g) => g,
        Err(poisoned) => {
            log::warn!("LIGHTCLIENT RwLock poisoned; recovering and clearing poison");
            let g = poisoned.into_inner();
            LIGHTCLIENT.clear_poison();
            g
        }
    };

    match guard.as_ref() {
        Some(lightclient) => f(lightclient),
        None => Err(ZingolibError::LightclientNotInitialized),
    }
}

fn reset_lightclient() {
    with_lightclient_write(|slot| {
        *slot = None;
    });
}

fn store_client(lightclient: LightClient) -> Result<(), ZingolibError> {
    with_lightclient_write(|slot| {
        *slot = Some(lightclient);
    });
    Ok(())
}

fn construct_uri_load_config(
    uri: String,
    chain_hint: String,
    performance_level: String,
    min_confirmations: u32,
) -> Result<(ZingoConfig, http::Uri), String> {
    // if uri is empty -> Offline Mode.
    let lightwalletd_uri = construct_lightwalletd_uri(Some(uri));

    let chaintype = match chain_hint.as_str() {
        "main" => chain_from_str("mainnet"),
        "test" => chain_from_str("testnet"),
        "regtest" => chain_from_str("regtest"),
        _ => return Err("Error: Not a valid chain hint!".to_string()),
    }
    .map_err(|e| format!("Error: {e}"))?;
    let performancetype = match performance_level.as_str() {
        "Maximum" => PerformanceLevel::Maximum,
        "High" => PerformanceLevel::High,
        "Medium" => PerformanceLevel::Medium,
        "Low" => PerformanceLevel::Low,
        _ => return Err("Error: Not a valid performance level!".to_string()),
    };
    let config = match zingolib::config::load_clientconfig(
        lightwalletd_uri.clone(),
        None,
        chaintype,
        WalletSettings {
            sync_config: SyncConfig {
                transparent_address_discovery: TransparentAddressDiscovery::minimal(),
                performance_level: performancetype,
            },
            min_confirmations: NonZeroU32::try_from(min_confirmations).unwrap(),
        },
        NonZeroU32::try_from(1).expect("hard-coded integer"),
        String::new(),
    ) {
        Ok(c) => c,
        Err(e) => {
            return Err(format!("Error: Config load: {e}"));
        }
    };

    Ok((config, lightwalletd_uri))
}

#[uniffi::export]
pub fn init_logging() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        // this is only for Android
        #[cfg(target_os = "android")]
        android_logger::init_once(
            Config::default().with_min_level(Level::Trace).with_filter(
                FilterBuilder::new()
                    .parse("debug,hello::crate=zingolib")
                    .build(),
            ),
        );
        Ok("OK".to_string())
    })
}

#[uniffi::export]
pub fn init_new(
    server_uri: String,
    chain_hint: String,
    performance_level: String,
    min_confirmations: u32,
) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        reset_lightclient();
        let (config, _lightwalletd_uri) = match construct_uri_load_config(
            server_uri,
            chain_hint,
            performance_level,
            min_confirmations,
        ) {
            Ok(c) => c,
            Err(e) => return Ok(format!("Error: {e}")),
        };
        // Offline: a fresh wallet needs no indexer contact. Its birthday is the
        // chain's Sapling activation height, so the first online sync scans the
        // whole shielded history but the wallet is correct regardless of which
        // note commitment tree state the indexer later serves.
        let lightclient =
            match LightClient::new_offline(config, false, SeedDerivation::Zip32Standard) {
                Ok(l) => l,
                Err(e) => return Ok(format!("Error: {e}")),
            };
        let _ = store_client(lightclient);

        get_seed()
    })
}

// TODO: change `seed` to `seed_phrase` or `mnemonic_phrase`
#[uniffi::export]
pub fn init_from_seed(
    seed: String,
    birthday: u32,
    server_uri: String,
    chain_hint: String,
    performance_level: String,
    min_confirmations: u32,
) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        reset_lightclient();
        let (config, _lightwalletd_uri) = match construct_uri_load_config(
            server_uri,
            chain_hint,
            performance_level,
            min_confirmations,
        ) {
            Ok(c) => c,
            Err(e) => return Ok(format!("Error: {e}")),
        };
        let mnemonic = match Mnemonic::from_phrase(seed) {
            Ok(m) => m,
            Err(e) => return Ok(format!("Error: {e}")),
        };
        let wallet = match LightWallet::new(
            config.chain,
            WalletBase::Mnemonic {
                mnemonic,
                no_of_accounts: config.no_of_accounts,
                seed_derivation: SeedDerivation::Zip32Standard,
            },
            BlockHeight::from_u32(birthday),
            config.wallet_settings.clone(),
        ) {
            Ok(w) => w,
            Err(e) => return Ok(format!("Error: {e}")),
        };
        let lightclient = match LightClient::create_from_wallet(wallet, config, false) {
            Ok(l) => l,
            Err(e) => return Ok(format!("Error: {e}")),
        };
        let _ = store_client(lightclient);

        get_seed()
    })
}

#[uniffi::export]
pub fn init_from_b64(
    base64_data: String,
    server_uri: String,
    chain_hint: String,
    performance_level: String,
    min_confirmations: u32,
) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        reset_lightclient();
        let (config, _lightwalletd_uri) = match construct_uri_load_config(
            server_uri,
            chain_hint,
            performance_level,
            min_confirmations,
        ) {
            Ok(c) => c,
            Err(e) => return Ok(format!("Error: {e}")),
        };
        let decoded_bytes = match STANDARD.decode(&base64_data) {
            Ok(b) => b,
            Err(e) => {
                return Ok(format!(
                    "Error: Decoding Base64: {}, Size: {}, Content: {}",
                    e,
                    base64_data.len(),
                    base64_data
                ));
            }
        };

        let wallet = match LightWallet::read(&decoded_bytes[..], config.chain) {
            Ok(w) => w,
            Err(e) => return Ok(format!("Error: {e}")),
        };
        let has_seed = wallet.mnemonic().is_some();
        let lightclient = match LightClient::create_from_wallet(wallet, config, false) {
            Ok(l) => l,
            Err(e) => return Ok(format!("Error: {e}")),
        };
        let _ = store_client(lightclient);

        if has_seed { get_seed() } else { get_ufvk() }
    })
}

#[uniffi::export]
pub fn save_to_b64() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        // Return the wallet as a base64 encoded string
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;
        if let Some(lightclient) = &mut *guard {
            // we need to use STANDARD because swift is expecting the encoded String with padding
            // I tried with STANDARD_NO_PAD and the decoding return `nil`.
            Ok(RT.block_on(async move {
                let mut wallet = lightclient.wallet.write().await;
                match wallet.save() {
                    Ok(Some(wallet_bytes)) => STANDARD.encode(wallet_bytes),
                    // TODO: check this is better than a custom error when save is not required (empty buffer)
                    Ok(None) => "".to_string(),
                    Err(e) => format!("Error: {e}"),
                }
            }))
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

#[uniffi::export]
pub fn check_b64(base64_data: String) -> String {
    match STANDARD.decode(&base64_data) {
        Ok(_) => "true".to_string(),
        Err(_) => "false".to_string(),
    }
}

#[uniffi::export]
pub fn get_developer_donation_address() -> Result<String, ZingolibError> {
    with_panic_guard(|| Ok(zingolib::config::DEVELOPER_DONATION_ADDRESS.to_string()))
}

#[uniffi::export]
pub fn get_zennies_for_zingo_donation_address() -> Result<String, ZingolibError> {
    with_panic_guard(|| Ok(zingolib::config::ZENNIES_FOR_ZINGO_DONATION_ADDRESS.to_string()))
}

#[uniffi::export]
pub fn set_crypto_default_provider_to_ring() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        Ok(CryptoProvider::get_default().map_or_else(
            || match default_provider().install_default() {
                Ok(_) => "true".to_string(),
                Err(_) => "Error: Failed to install crypto provider".to_string(),
            },
            |_| "true".to_string(),
        ))
    })
}

#[uniffi::export]
pub fn get_latest_block_server(server_uri: String) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let lightwalletd_uri: http::Uri = match server_uri.parse() {
            Ok(uri) => uri,
            Err(e) => {
                return Ok(format!("Error: failed to parse uri. {e}"));
            }
        };
        Ok(
            match RT.block_on(async move {
                zingolib::grpc_connector::get_latest_block(lightwalletd_uri).await
            }) {
                Ok(block_id) => block_id.height.to_string(),
                Err(e) => format!("Error: {e}"),
            },
        )
    })
}

fn stable_chain() -> ChainType {
    chain_from_str("testnet").expect("a known chain name")
}

fn discovery_config(network: &str) -> discovery::DiscoveryConfig {
    let config = match network {
        "nightly" => discovery::DiscoveryConfig::crosslink_nightly(),
        _ => discovery::DiscoveryConfig::crosslink_stable(),
    };
    let chain = stable_chain();
    config.with_branch_rule(discovery::BranchRule::new(move |height| {
        let height = BlockHeight::from_u32(u32::try_from(height).unwrap_or(u32::MAX));
        u32::from(zcash_protocol::consensus::BranchId::for_height(
            &chain, height,
        ))
    }))
}

async fn fingerprint_of(lightclient: &LightClient) -> Option<discovery::ChainFingerprint> {
    let wallet = lightclient.wallet.read().await;
    wallet
        .wallet_blocks
        .last_key_value()
        .map(|(height, block)| discovery::ChainFingerprint {
            height: u32::from(*height),
            hash: block.block_hash().0,
        })
}

fn wallet_fingerprint() -> Option<discovery::ChainFingerprint> {
    let guard = LIGHTCLIENT.read().ok()?;
    let lightclient = guard.as_ref()?;
    RT.block_on(fingerprint_of(lightclient))
}

async fn faucet_at(uri: http::Uri, address: &str) -> Result<u64, String> {
    use zcash_client_backend::proto::service::FaucetRequest;
    let mut client = get_client(uri)
        .await
        .map_err(|e| format!("cannot reach the indexer: {e}"))?;
    let answer = client
        .request_faucet_donation(FaucetRequest {
            address: address.to_string(),
        })
        .await
        .map_err(|e| e.message().to_string())?;
    Ok(answer.into_inner().amount)
}

async fn faucet_anywhere(lightclient: &LightClient, address: &str) -> Result<u64, String> {
    let current = lightclient.indexer_uri();
    let mut refusals = Vec::new();
    match faucet_at(current.clone(), address).await {
        Ok(amount) => return Ok(amount),
        Err(e) => refusals.push(format!("{current}: {e}")),
    }
    let current_key = discovery::indexer_key(&current.to_string());
    let fingerprint = fingerprint_of(lightclient).await;
    let report = discovery::discover(&discovery_config("stable"), fingerprint).await;
    for indexer in report.ranking.iter().filter(|i| i.tip_height.is_some()) {
        if discovery::indexer_key(&indexer.uri) == current_key {
            continue;
        }
        let Ok(uri) = indexer.uri.parse::<http::Uri>() else {
            continue;
        };
        match faucet_at(uri, address).await {
            Ok(amount) => return Ok(amount),
            Err(e) => refusals.push(format!("{}: {e}", indexer.uri)),
        }
    }
    Err(format!(
        "no indexer served the faucet: {}",
        refusals.join("; ")
    ))
}

fn report_json(report: discovery::IndexerReport) -> String {
    let indexers: Vec<JsonValue> = report
        .ranking
        .iter()
        .filter(|indexer| indexer.tip_height.is_some())
        .map(|indexer| {
            object! {
                "uri" => indexer.uri.clone(),
                "latency_ms" => u64::try_from(indexer.latency.as_millis()).unwrap_or(u64::MAX),
                "tip_height" => indexer.tip_height,
                "tip_age_secs" => indexer.tip_age_secs,
                "source" => match indexer.source {
                    discovery::Source::PeerExchange => "peer",
                    discovery::Source::DnsSeed => "dns",
                    discovery::Source::Builtin => "builtin",
                },
            }
        })
        .collect();
    object! {
        "indexers" => indexers,
        "errors" => report.errors,
    }
    .dump()
}

#[uniffi::export]
pub fn discover_indexers(network: String) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let config = discovery_config(&network);
        let fingerprint = wallet_fingerprint();
        let report = RT.block_on(async move { discovery::discover(&config, fingerprint).await });
        Ok(report_json(report))
    })
}

#[uniffi::export]
pub fn probe_indexer(server_uri: String, network: String) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let config = discovery_config(&network);
        let fingerprint = wallet_fingerprint();
        let uris = vec![(server_uri, discovery::Source::Builtin)];
        let report =
            RT.block_on(async move { discovery::health_check(&config, uris, fingerprint).await });
        Ok(report_json(report))
    })
}

/// Probes the network's built-in indexers with the wallet's newest block as the chain check,
/// and points the wallet at the one reporting the highest tip. The answer is where the wallet
/// now points, or an error string when no built-in indexer serves this chain. Unknown network
/// names keep the stable default; only "nightly" selects the nightly list.
#[uniffi::export]
pub fn select_best_indexer(network: String) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let config = discovery_config(&network);
        let fingerprint = wallet_fingerprint();
        let uris: Vec<(String, discovery::Source)> = config
            .seed_uris
            .iter()
            .map(|uri| (uri.clone(), discovery::Source::Builtin))
            .collect();
        let report =
            RT.block_on(async move { discovery::health_check(&config, uris, fingerprint).await });
        let best = match report.ranking.iter().find(|i| i.tip_height.is_some()) {
            Some(best) => best,
            None => {
                for error in &report.errors {
                    log::warn!("indexer probe: {error}");
                }
                return Ok("Error: no indexer answered the probe".to_string());
            }
        };
        let uri = match best.uri.parse::<http::Uri>() {
            Ok(uri) => uri,
            Err(e) => return Ok(format!("Error: {e}")),
        };
        with_lightclient_read(|lightclient| {
            if lightclient.indexer_uri() != uri {
                lightclient.set_indexer(uri.clone());
            }
            Ok(uri.to_string())
        })
    })
}

/// Reads the wallet file format version from the raw wallet bytes.
fn wallet_format_version(decoded: &[u8]) -> u64 {
    if decoded.len() >= 8 {
        u64::from_le_bytes(decoded[0..8].try_into().expect("8 bytes into u64"))
    } else {
        0
    }
}

/// The wallet bytes behind a file's bytes, and whether an extra base64 layer
/// was needed: Android stores the decoded wallet binary; iOS stores its
/// base64 text — try both, one layer apart.
fn wallet_bytes(file_bytes: &[u8]) -> Option<(Vec<u8>, bool)> {
    let version = wallet_format_version(file_bytes);
    if (1..=40).contains(&version) {
        return Some((file_bytes.to_vec(), false));
    }
    let decoded = STANDARD.decode(file_bytes).ok()?;
    let version = wallet_format_version(&decoded);
    if (1..=40).contains(&version) {
        return Some((decoded, true));
    }
    None
}

/// Whether the indexer's chain contains the block at `height` and its hash matches.
///
/// A wallet claiming a block beyond the served tip is on another chain. Unreachable
/// indexers answer `None` — unknown, not mismatched.
async fn indexer_has_block(server_uri: http::Uri, height: u32, hash: [u8; 32]) -> Option<bool> {
    use zcash_client_backend::proto::service::BlockId;

    let tip = match tokio::time::timeout(
        std::time::Duration::from_secs(20),
        zingolib::grpc_connector::get_latest_block(server_uri.clone()),
    )
    .await
    {
        Ok(Ok(tip)) => u32::try_from(tip.height).ok()?,
        _ => return None,
    };
    if height > tip {
        return Some(false);
    }
    let mut client = match tokio::time::timeout(
        std::time::Duration::from_secs(20),
        get_client(server_uri),
    )
    .await
    {
        Ok(Ok(client)) => client,
        _ => return None,
    };
    let answer = match tokio::time::timeout(
        std::time::Duration::from_secs(20),
        client.get_block(BlockId {
            height: u64::from(height),
            hash: Vec::new(),
        }),
    )
    .await
    {
        Ok(Ok(answer)) => answer.into_inner(),
        Ok(Err(status)) => {
            let message = status.message().to_ascii_lowercase();
            return if message.contains("not found") {
                Some(false)
            } else {
                None
            };
        }
        Err(_) => return None,
    };
    Some(answer.hash.as_slice() == hash.as_slice())
}

/// Classifies a wallet file without touching the stored one: whether the current reader can
/// parse it, and — when it can and the wallet has synced blocks — whether those blocks belong
/// to the chain the indexer serves. A wallet from the previous network reads fine (the chain
/// names coincide) but its blocks do not, so the hash comparison is the only real test.
///
/// The platforms keep the file in different shapes: Android stores the decoded binary, iOS
/// its base64 text. When the file is in the other platform's shape but is otherwise a valid
/// wallet, `normalize_to` carries the wallet bytes base64-encoded, ready for the caller to
/// write back in its own platform's shape.
#[uniffi::export]
pub fn inspect_wallet(
    base64_data: String,
    server_uri: String,
    platform: String,
) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let file_bytes = match STANDARD.decode(&base64_data) {
            Ok(file_bytes) => file_bytes,
            Err(e) => {
                return Ok(object! {
                    "readable" => false,
                    "format_version" => 0,
                    "chain_match" => json::JsonValue::Null,
                    "normalize_to" => json::JsonValue::Null,
                    "reason" => format!("base64 decode: {e}"),
                }
                .dump());
            }
        };
        let (wallet_bytes, needs_normalizing) = match wallet_bytes(&file_bytes) {
            Some(pair) => pair,
            None => {
                return Ok(object! {
                    "readable" => false,
                    "format_version" => wallet_format_version(&file_bytes),
                    "chain_match" => json::JsonValue::Null,
                    "normalize_to" => json::JsonValue::Null,
                    "reason" => "not a wallet file in any known encoding",
                }
                .dump());
            }
        };
        let format_version = wallet_format_version(&wallet_bytes);
        let platform_wants_binary = platform == "android";
        let normalize_to = if needs_normalizing != platform_wants_binary {
            json::JsonValue::Null
        } else {
            json::JsonValue::from(STANDARD.encode(&wallet_bytes))
        };
        let wallet = match LightWallet::read(&wallet_bytes[..], stable_chain()) {
            Ok(wallet) => wallet,
            Err(e) => {
                return Ok(object! {
                    "readable" => false,
                    "format_version" => format_version,
                    "chain_match" => json::JsonValue::Null,
                    "normalize_to" => normalize_to,
                    "reason" => e.to_string(),
                }
                .dump());
            }
        };
        let newest = wallet
            .wallet_blocks
            .iter()
            .next_back()
            .map(|(height, block)| (u32::from(*height), block.block_hash().0));
        let (newest_height, chain_match) = match newest {
            None => (json::JsonValue::Null, json::JsonValue::Null),
            Some((height, hash)) => {
                let answer = if server_uri.is_empty() {
                    None
                } else {
                    match server_uri.parse::<http::Uri>() {
                        Ok(uri) => RT.block_on(indexer_has_block(uri, height, hash)),
                        Err(_) => None,
                    }
                };
                let chain_match = match answer {
                    Some(m) => json::JsonValue::from(m),
                    None => json::JsonValue::Null,
                };
                (json::JsonValue::from(height), chain_match)
            }
        };
        Ok(object! {
            "readable" => true,
            "format_version" => format_version,
            "newest_height" => newest_height,
            "chain_match" => chain_match,
            "normalize_to" => normalize_to,
        }
        .dump())
    })
}

#[uniffi::export]
pub fn get_latest_block_wallet() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        with_lightclient_read(|lightclient| {
            Ok(RT.block_on(async move {
                let wallet = lightclient.wallet.write().await;
                to_json(&WalletHeight {
                    height: wallet
                        .sync_state
                        .last_known_chain_height()
                        .map(u32::from)
                        .unwrap_or(0),
                })
            }))
        })
    })
}

#[uniffi::export]
pub fn get_value_transfers() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        with_lightclient_read(|lightclient| {
            Ok(RT.block_on(async move {
                match lightclient.wallet_events(true).await {
                    Ok(wallet_events) => to_json(&ValueTransfers::from(wallet_events)),
                    Err(e) => format!("Error: {e}"),
                }
            }))
        })
    })
}

#[uniffi::export]
pub fn poll_sync() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;
        if let Some(lightclient) = &mut *guard {
            Ok(match lightclient.poll_sync() {
                PollReport::NoHandle => "Sync task has not been launched.".to_string(),
                PollReport::NotReady => "Sync task is not complete.".to_string(),
                PollReport::Ready(result) => match result {
                    Ok(sync_result) => to_json(&SyncPoll {
                        sync_complete: SessionReport::from(sync_result).into(),
                    }),
                    Err(e) => format!("Error: {e}"),
                },
            })
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

#[uniffi::export]
pub fn run_sync() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;
        if let Some(lightclient) = &mut *guard {
            if lightclient.sync_mode() == SyncMode::Paused {
                lightclient.resume_sync().expect("sync should be paused");
                Ok("Resuming sync task...".to_string())
            } else {
                Ok(RT.block_on(async {
                    match lightclient.sync().await {
                        Ok(_) => "Launching sync task...".to_string(),
                        Err(e) => format!("Error: {e}"),
                    }
                }))
            }
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

#[uniffi::export]
pub fn pause_sync() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;
        if let Some(lightclient) = &mut *guard {
            Ok(match lightclient.pause_sync() {
                Ok(_) => "Pausing sync task...".to_string(),
                Err(e) => format!("Error: {e}"),
            })
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

#[uniffi::export]
pub fn status_sync() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;
        if let Some(lightclient) = &mut *guard {
            Ok(RT.block_on(async {
                let wallet = lightclient.wallet.read().await;
                match pepper_sync::sync_status(&*wallet).await {
                    Ok(status) => to_json(&SyncStatus::from(SyncProgress::from(status))),
                    Err(e) => format!("Error: {e}"),
                }
            }))
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

#[uniffi::export]
pub fn run_rescan() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;
        if let Some(lightclient) = &mut *guard {
            Ok(RT.block_on(async move {
                match lightclient.rescan().await {
                    Ok(_) => "Launching rescan...".to_string(),
                    Err(e) => format!("Error: {e}"),
                }
            }))
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

#[uniffi::export]
pub fn info_server() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        with_lightclient_read(|lightclient| {
            Ok(RT.block_on(async move {
                let indexer_uri = lightclient.indexer_uri();
                match zingolib::grpc_connector::get_info(indexer_uri.clone()).await {
                    Ok(info) => to_json(&WalletInfo::new(info, indexer_uri.to_string())),
                    Err(e) => e,
                }
            }))
        })
    })
}

#[uniffi::export]
pub fn get_roster() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        with_lightclient_read(|lightclient| {
            Ok(RT.block_on(async move {
                match lightclient.get_roster_info().await {
                    Ok(roster_info) => to_json(&Roster::from(roster_info)),
                    Err(e) => {
                        format!("Error: {e}")
                    }
                }
            }))
        })
    })
}

#[uniffi::export]
pub fn request_faucet_funds(address: String) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;

        if let Some(lightclient) = &mut *guard {
            Ok(RT.block_on(async move {
                match faucet_anywhere(lightclient, &address).await {
                    Ok(amount) => JsonValue::from(amount.to_string()).pretty(2),
                    Err(e) => format!("Error: {e}"),
                }
            }))
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

// TODO: rename "get_seed_phrase" or "get_mnemonic_phrase"
// or if other recovery info is being used could rename "get_recovery_info" ?
#[uniffi::export]
pub fn get_seed() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        with_lightclient_read(|lightclient| {
            Ok(RT.block_on(async move {
                let wallet = lightclient.wallet.read().await;
                match wallet.recovery_info() {
                    Some(recovery_info) => to_json(&Seed::from(recovery_info)),
                    None => {
                        "Error: get seed. no mnemonic found. wallet loaded from key.".to_string()
                    }
                }
            }))
        })
    })
}

#[uniffi::export]
pub fn get_ufvk() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        with_lightclient_read(|lightclient| {
            Ok(RT.block_on(async move {
                let wallet = lightclient.wallet.read().await;
                let ufvk: UnifiedFullViewingKey = match wallet
                    .unified_key_store
                    .get(&AccountId::ZERO)
                    .expect("account 0 must always exist")
                    .try_into()
                {
                    Ok(ufvk) => ufvk,
                    Err(e) => return format!("Error: {e}"),
                };
                to_json(&Ufvk {
                    ufvk: ufvk.encode(&wallet.network),
                    birthday: u32::from(wallet.birthday),
                })
            }))
        })
    })
}

#[uniffi::export]
pub fn change_server(server_uri: String) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;
        if let Some(lightclient) = &mut *guard {
            if server_uri.is_empty() {
                lightclient.set_indexer(http::Uri::default());
                Ok("server set (default)".to_string())
            } else {
                match http::Uri::from_str(&server_uri) {
                    Ok(uri) => {
                        lightclient.set_indexer(uri);
                        Ok("server set".to_string())
                    }
                    Err(_) => Ok("Error: invalid server uri".to_string()),
                }
            }
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

#[uniffi::export]
pub fn wallet_kind() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        with_lightclient_read(|lightclient| {
            Ok(RT.block_on(async move {
                let wallet = lightclient.wallet.read().await;
                let kind = if wallet.mnemonic().is_some() {
                    WalletKind {
                        kind: WalletKeyKind::SeedPhrase,
                        transparent: true,
                        sapling: true,
                        orchard: true,
                    }
                } else {
                    match wallet
                        .unified_key_store
                        .get(&AccountId::ZERO)
                        .expect("account 0 must always exist")
                    {
                        UnifiedKeyStore::Spend(_) => WalletKind {
                            kind: WalletKeyKind::UnifiedSpendingKey,
                            transparent: true,
                            sapling: true,
                            orchard: true,
                        },
                        UnifiedKeyStore::View(ufvk) => WalletKind {
                            kind: WalletKeyKind::UnifiedFullViewingKey,
                            transparent: ufvk.transparent().is_some(),
                            sapling: ufvk.sapling().is_some(),
                            orchard: ufvk.orchard().is_some(),
                        },
                        UnifiedKeyStore::Empty => WalletKind {
                            kind: WalletKeyKind::NoKeysFound,
                            transparent: false,
                            sapling: false,
                            orchard: false,
                        },
                    }
                };
                to_json(&kind)
            }))
        })
    })
}

fn unified_address_payload(
    id: &zingolib::wallet::keys::unified::UnifiedAddressId,
    unified_address: &zcash_keys::address::UnifiedAddress,
    network: &ChainType,
) -> UnifiedAddress {
    UnifiedAddress {
        account: u32::from(id.account_id),
        address_index: id.address_index,
        has_orchard: unified_address.has_orchard(),
        has_sapling: unified_address.has_sapling(),
        has_transparent: unified_address.has_transparent(),
        encoded_address: unified_address.encode(network),
    }
}

fn transparent_address_payload(
    id: &transparent::TransparentAddressId,
    encoded_address: &str,
) -> TransparentAddress {
    TransparentAddress {
        account: u32::from(id.account_id()),
        address_index: id.address_index().index(),
        scope: id.scope().into(),
        encoded_address: encoded_address.to_string(),
    }
}

fn make_decoded_chain_pair(
    address: &str,
) -> Option<(zcash_client_backend::address::Address, ChainType)> {
    [
        chain_from_str("mainnet").expect("a known chain name"),
        chain_from_str("testnet").expect("a known chain name"),
        chain_from_str("regtest").expect("a known chain name"),
    ]
    .iter()
    .find_map(|chain| Address::decode(chain, address).zip(Some(*chain)))
}

#[uniffi::export]
pub fn parse_address(address: String) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        if address.is_empty() {
            Ok("Error: The address is empty".to_string())
        } else {
            if let Some((recipient_address, chain_name)) = make_decoded_chain_pair(&address) {
                let chain = match chain_name {
                    ChainType::Mainnet => ChainName::Main,
                    ChainType::Testnet(_) => ChainName::Test,
                    ChainType::Regtest(_) => ChainName::Regtest,
                };
                let parsed = match recipient_address {
                    Address::Sapling(_) => ParseAddress::valid(chain, AddressKind::Sapling),
                    Address::Transparent(_) => ParseAddress::valid(chain, AddressKind::Transparent),
                    Address::Tex(_) => ParseAddress::valid(chain, AddressKind::Tex),
                    Address::Unified(ua) => {
                        let mut receivers_available = vec![];
                        if ua.sapling().is_some() {
                            receivers_available.push(Receiver::Sapling);
                        }
                        if ua.transparent().is_some() {
                            receivers_available.push(Receiver::Transparent);
                        }
                        let only_orchard_ua = ua.orchard().map(|orchard| {
                            receivers_available.push(Receiver::Orchard);
                            zcash_keys::address::UnifiedAddress::from_receivers(
                                Some(*orchard),
                                None,
                                None,
                            )
                            .expect("To construct UA")
                            .encode(&chain_name)
                        });
                        ParseAddress {
                            receivers_available: Some(receivers_available),
                            only_orchard_ua,
                            ..ParseAddress::valid(chain, AddressKind::Unified)
                        }
                    }
                };
                Ok(to_json(&parsed))
            } else {
                Ok(to_json(&ParseAddress::invalid()))
            }
        }
    })
}

#[uniffi::export]
pub fn get_version() -> Result<String, ZingolibError> {
    with_panic_guard(|| Ok(zingolib::git_description().to_string()))
}

#[uniffi::export]
pub fn get_balance() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        with_lightclient_read(|lightclient| {
            Ok(RT.block_on(async move {
                match lightclient.account_balance(AccountId::ZERO).await {
                    Ok(bal) => to_json(&Balance::from(bal)),
                    Err(e) => format!("Error: {e}"),
                }
            }))
        })
    })
}

#[uniffi::export]
pub fn get_total_memobytes_to_address() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        with_lightclient_read(|lightclient| {
            Ok(RT.block_on(async move {
                match lightclient.do_total_memobytes_to_address().await {
                    Ok(total_memo_bytes) => json::JsonValue::from(total_memo_bytes).pretty(2),
                    Err(e) => format!("Error: {e}"),
                }
            }))
        })
    })
}

#[uniffi::export]
pub fn get_total_value_to_address() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        with_lightclient_read(|lightclient| {
            Ok(RT.block_on(async move {
                match lightclient.do_total_value_to_address().await {
                    Ok(total_values) => json::JsonValue::from(total_values).pretty(2),
                    Err(e) => format!("Error: {e}"),
                }
            }))
        })
    })
}

#[uniffi::export]
pub fn get_total_spends_to_address() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        with_lightclient_read(|lightclient| {
            Ok(RT.block_on(async move {
                match lightclient.do_total_spends_to_address().await {
                    Ok(total_spends) => json::JsonValue::from(total_spends).pretty(2),
                    Err(e) => format!("Error: {e}"),
                }
            }))
        })
    })
}

#[uniffi::export]
pub fn zec_price(tor: String) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;
        if let Some(lightclient) = &mut *guard {
            Ok(RT.block_on(async move {
                let Ok(tor_bool) = tor.parse() else {
                    return "Error: failed to parse tor setting.".to_string();
                };
                let client_check = match (tor_bool, lightclient.tor_client()) {
                    (true, Some(tc)) => Ok(Some(tc)),
                    (true, None) => Err(()),
                    (false, _) => Ok(None),
                };
                let tor_client = match client_check {
                    Ok(tc) => tc,
                    Err(_) => {
                        return "Error: no tor client found. please create a tor client."
                            .to_string();
                    }
                };

                let mut wallet = lightclient.wallet.write().await;
                match wallet.update_current_price(tor_client).await {
                    Ok(price) => to_json(&ZecPrice {
                        current_price: price,
                    }),
                    Err(e) => format!("Error: {e}"),
                }
            }))
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

// we don't use this anymore...
#[uniffi::export]
pub fn get_spendable_balance_with_address(
    address: String,
    zennies: String,
) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        with_lightclient_read(|lightclient| {
            let Ok(address) = address_from_str(&address) else {
                return Ok("Error: unknown address format".to_string());
            };
            let Ok(zennies) = zennies.parse() else {
                return Ok("Error: failed to parse zennies setting.".to_string());
            };
            Ok(RT.block_on(async move {
                match lightclient
                    .max_send_value(address, zennies, AccountId::ZERO)
                    .await
                {
                    Ok(bal) => to_json(&SpendableBalance {
                        spendable_balance: bal.into_u64(),
                    }),
                    Err(e) => format!("error: {e}"),
                }
            }))
        })
    })
}

#[uniffi::export]
pub fn get_spendable_balance_total() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        with_lightclient_read(|lightclient| {
            Ok(RT.block_on(async move {
                let wallet = lightclient.wallet.write().await;
                let spendable_balance =
                    match wallet.shielded_spendable_balance(AccountId::ZERO, false) {
                        Ok(bal) => bal,
                        Err(e) => return format!("Error: {e}"),
                    };
                to_json(&SpendableBalance {
                    spendable_balance: spendable_balance.into_u64(),
                })
            }))
        })
    })
}

#[uniffi::export]
pub fn create_tor_client(data_dir: String) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;
        if let Some(lightclient) = &mut *guard {
            if lightclient.tor_client().is_some() {
                return Ok("Tor client already exists.".to_string());
            }
            Ok(
                match RT.block_on(async move {
                    lightclient.create_tor_client(Some(data_dir.into())).await
                }) {
                    Ok(_) => "Successfully created tor client.".to_string(),
                    Err(e) => format!("Error: creating tor client: {e}"),
                },
            )
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

#[uniffi::export]
pub fn remove_tor_client() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;
        if let Some(lightclient) = &mut *guard {
            if lightclient.tor_client().is_none() {
                return Ok("Tor client is not active.".to_string());
            }
            RT.block_on(async move {
                lightclient.remove_tor_client().await;
            });
            Ok("Successfully removed tor client.".to_string())
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

#[uniffi::export]
pub fn get_unified_addresses() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        with_lightclient_read(|lightclient| {
            Ok(RT.block_on(async move {
                let wallet = lightclient.wallet.read().await;
                let addresses: Vec<UnifiedAddress> = wallet
                    .unified_addresses()
                    .iter()
                    .map(|(id, unified_address)| {
                        unified_address_payload(id, unified_address, &wallet.network)
                    })
                    .collect();
                to_json(&addresses)
            }))
        })
    })
}

#[uniffi::export]
pub fn get_transparent_addresses() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        with_lightclient_read(|lightclient| {
            Ok(RT.block_on(async move {
                let wallet = lightclient.wallet.read().await;
                let addresses: Vec<TransparentAddress> = wallet
                    .transparent_addresses()
                    .iter()
                    .map(|(id, encoded_address)| transparent_address_payload(id, encoded_address))
                    .collect();
                to_json(&addresses)
            }))
        })
    })
}

#[uniffi::export]
pub fn create_new_unified_address(receivers: String) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;
        if let Some(lightclient) = &mut *guard {
            Ok(RT.block_on(async move {
                let mut wallet = lightclient.wallet.write().await;
                let network = wallet.network;
                let receivers_available = ReceiverSelection {
                    orchard: receivers.contains('o'),
                    sapling: receivers.contains('z'),
                };
                match wallet.generate_unified_address(receivers_available, AccountId::ZERO) {
                    Ok((id, unified_address)) => {
                        to_json(&unified_address_payload(&id, &unified_address, &network))
                    }
                    Err(e) => format!("Error: {e}"),
                }
            }))
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

#[uniffi::export]
pub fn create_new_transparent_address() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;
        if let Some(lightclient) = &mut *guard {
            Ok(RT.block_on(async move {
                let mut wallet = lightclient.wallet.write().await;
                let network = wallet.network;
                match wallet.generate_transparent_address(AccountId::ZERO, true) {
                    Ok((id, transparent_address)) => to_json(&transparent_address_payload(
                        &id,
                        &transparent::encode_address(&network, transparent_address),
                    )),
                    Err(e) => format!("Error: {e}"),
                }
            }))
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

#[uniffi::export]
pub fn check_my_address(address: String) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        with_lightclient_read(|lightclient| {
            Ok(RT.block_on(async move {
                let wallet = lightclient.wallet.read().await;
                match wallet.is_address_derived_by_keys(&address) {
                    Ok(address_ref) => to_json(&CheckAddress::from(address_ref)),
                    Err(e) => format!("Error: {e}"),
                }
            }))
        })
    })
}

#[uniffi::export]
pub fn get_wallet_save_required() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        with_lightclient_read(|lightclient| {
            Ok(RT.block_on(async move {
                let wallet = lightclient.wallet.read().await;
                to_json(&WalletSaveRequired {
                    save_required: wallet.save_required,
                })
            }))
        })
    })
}

#[uniffi::export]
pub fn set_config_wallet_to_prod(
    performance_level: String,
    min_confirmations: u32,
) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;
        if let Some(lightclient) = &mut *guard {
            Ok(RT.block_on(async move {
                let performancetype = match performance_level.as_str() {
                    "Maximum" => PerformanceLevel::Maximum,
                    "High" => PerformanceLevel::High,
                    "Medium" => PerformanceLevel::Medium,
                    "Low" => PerformanceLevel::Low,
                    _ => return "Error: Not a valid performance level!".to_string(),
                };
                let mut wallet = lightclient.wallet.write().await;
                wallet.wallet_settings.min_confirmations =
                    NonZeroU32::try_from(min_confirmations).unwrap();
                wallet.wallet_settings.sync_config.performance_level = performancetype;
                wallet.save_required = true;
                "Successfully set config wallet to prod.".to_string()
            }))
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

#[uniffi::export]
pub fn get_config_wallet_performance() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        with_lightclient_read(|lightclient| {
            Ok(RT.block_on(async move {
                let wallet = lightclient.wallet.read().await;
                to_json(&ConfigWalletPerformance {
                    performance_level: wallet.wallet_settings.sync_config.performance_level.into(),
                })
            }))
        })
    })
}

#[uniffi::export]
pub fn get_wallet_version() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        with_lightclient_read(|lightclient| {
            Ok(RT.block_on(async move {
                let wallet = lightclient.wallet.read().await;
                to_json(&WalletVersion {
                    current_version: wallet.current_version(),
                    read_version: wallet.read_version(),
                })
            }))
        })
    })
}

// internal use
fn interpret_memo_string(memo_str: String) -> Result<MemoBytes, String> {
    // If the string starts with an "0x", and contains only hex chars ([a-f0-9]+) then
    // interpret it as a hex
    let s_bytes = if memo_str.to_lowercase().starts_with("0x") {
        match hex::decode(&memo_str[2..memo_str.len()]) {
            Ok(data) => data,
            Err(_) => Vec::from(memo_str.as_bytes()),
        }
    } else {
        Vec::from(memo_str.as_bytes())
    };

    MemoBytes::from_bytes(&s_bytes)
        .map_err(|_| format!("Error: creating output. Memo '{:?}' is too long", memo_str))
}

#[uniffi::export]
pub fn send(send_json: String) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;
        if let Some(lightclient) = &mut *guard {
            Ok(RT.block_on(async move {
                let json_args = match json::parse(&send_json) {
                    Ok(parsed) => parsed,
                    Err(_) => return "Error: it is not a valid JSON".to_string(),
                };

                let mut receivers = Receivers::new();
                for j in json_args.members() {
                    let recipient_address = match j["address"].as_str() {
                        Some(addr) => match ZcashAddress::try_from_encoded(addr) {
                            Ok(a) => a,
                            Err(e) => return format!("Error: Invalid address: {e}"),
                        },
                        None => return "Error: Missing address".to_string(),
                    };

                    let amount = match j["amount"].as_u64() {
                        Some(a) => match Zatoshis::from_u64(a) {
                            Ok(a) => a,
                            Err(e) => return format!("Error: Invalid amount: {e}"),
                        },
                        None => return "Missing amount".to_string(),
                    };

                    let memo = if let Some(m) = j["memo"].as_str() {
                        match interpret_memo_string(m.to_string()) {
                            Ok(memo_bytes) => Some(memo_bytes),
                            Err(e) => return format!("Error: Invalid memo: {e}"),
                        }
                    } else {
                        None
                    };

                    receivers.push(zingolib::data::receivers::Receiver {
                        recipient_address,
                        amount,
                        memo,
                    });
                }

                let request = match transaction_request_from_receivers(receivers) {
                    Ok(request) => request,
                    Err(e) => return format!("Error: Request Error: {e}"),
                };

                let propose = match lightclient.propose_send(request, AccountId::ZERO).await {
                    Ok(proposal) => match total_fee(&proposal) {
                        Ok(fee) => Propose::fee(fee.into_u64()),
                        Err(e) => Propose::error(e),
                    },
                    Err(e) => Propose::error(e),
                };
                to_json(&propose)
            }))
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

/// `stake_json` is a JSON object with the following schema:
/// {
///   "amount_zats": 1000000,
///   "finalizer_address": "..."
/// }
#[uniffi::export]
pub fn stake(stake_json: String) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;
        if let Some(lightclient) = &mut *guard {
            Ok(RT.block_on(async move {
                let json_args = match json::parse(&stake_json) {
                    Ok(parsed) => parsed,
                    Err(_) => return "Error: it is not a valid JSON".to_string(),
                };

                let amount = match json_args["amount_zats"].as_u64() {
                    Some(a) => match Zatoshis::from_u64(a) {
                        Ok(a) => a,
                        Err(e) => return format!("Error: Invalid amount: {e}"),
                    },
                    None => return "Missing amount".to_string(),
                };

                let finalizer_address = match json_args["finalizer_address"].as_str() {
                    Some(addr) => match resolve_finalizer_address(lightclient, addr).await {
                        Ok(address) => address,
                        Err(e) => return e,
                    },
                    None => return "Error: Missing address".to_string(),
                };

                let propose = match lightclient
                    .propose_stake(amount, finalizer_address, AccountId::ZERO)
                    .await
                {
                    Ok(proposal) => match total_fee(&proposal.proportional_fee_proposal()) {
                        Ok(fee) => Propose::fee(fee.into_u64()),
                        Err(e) => Propose::error(e),
                    },
                    Err(e) => Propose::error(e),
                };
                to_json(&propose)
            }))
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

/// `withdraw_stake_json` is a JSON object with the following schema:
/// {
///   "txid": "..."
/// }
#[uniffi::export]
pub fn withdraw_stake(withdraw_stake_json: String) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;

        if let Some(lightclient) = &mut *guard {
            Ok(RT.block_on(async move {
                let json_args = match json::parse(&withdraw_stake_json) {
                    Ok(parsed) => parsed,
                    Err(_) => return to_json(&WithdrawStake::error("invalid JSON")),
                };

                let txid_bytes = match json_args["txid"]
                    .as_str()
                    .and_then(|s| parse_hex_32(s).ok())
                {
                    Some(t) => t,
                    None => return to_json(&WithdrawStake::error("missing/invalid txid")),
                };

                let unfiltered_txs = match lightclient.transaction_summaries(false).await {
                    Ok(t) => t,
                    Err(e) => return to_json(&WithdrawStake::error(e)),
                };

                let found_tx = match unfiltered_txs
                    .iter()
                    .filter(|tx| tx.staking_action.is_some())
                    .find(|tx| tx.txid.to_string() == hex::encode(txid_bytes))
                {
                    Some(t) => t,
                    None => return to_json(&WithdrawStake::error("tx not found")),
                };

                let bond_key = found_tx.staking_action.as_ref().unwrap().bond_key();

                let res = lightclient.withdraw_bond(bond_key, AccountId::ZERO).await;
                match res {
                    Ok(txid) => to_json(&WithdrawStake::txid(txid)),
                    Err(e) => to_json(&WithdrawStake::error(e)),
                }
            }))
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

/// `begin_unstake_json` is a JSON object with the following schema:
/// {
///   "txid": "..."
/// }
#[uniffi::export]
pub fn begin_unstake(begin_unstake_json: String) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;
        if let Some(lightclient) = &mut *guard {
            Ok(RT.block_on(async move {
                let json_args = match json::parse(&begin_unstake_json) {
                    Ok(parsed) => parsed,
                    Err(_) => return "Error: it is not a valid JSON".to_string(),
                };

                // txid is in display order here
                let txid = parse_hex_32(json_args["txid"].as_str().unwrap()).unwrap();

                let unfiltered_txs = lightclient.transaction_summaries(false).await.unwrap();

                let found_tx = unfiltered_txs
                    .iter()
                    .filter(|tx| tx.staking_action.is_some())
                    .find(|tx| tx.txid.to_string() == hex::encode(txid))
                    .unwrap();

                let bond_key = found_tx.staking_action.as_ref().unwrap().bond_key();

                let propose = match lightclient
                    .propose_begin_unstake(bond_key, AccountId::ZERO)
                    .await
                {
                    Ok(proposal) => match total_fee(&proposal.proportional_fee_proposal()) {
                        Ok(fee) => Propose::fee(fee.into_u64()),
                        Err(e) => Propose::error(e),
                    },
                    Err(e) => Propose::error(e),
                };
                to_json(&propose)
            }))
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

/// `retarget_bond_json` is a JSON object with the following schema:
/// {
///   "bond_key": "...",
///   "new_finalizer": "..."
/// }
#[uniffi::export]
pub fn retarget_bond(retarget_bond_json: String) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;
        if let Some(lightclient) = &mut *guard {
            Ok(RT.block_on(async move {
                let json_args = match json::parse(&retarget_bond_json) {
                    Ok(parsed) => parsed,
                    Err(_) => return "Error: it is not a valid JSON".to_string(),
                };

                let bond_key = parse_hex_32(json_args["bond_key"].as_str().unwrap()).unwrap();

                let new_finalizer_address = match json_args["new_finalizer"].as_str() {
                    Some(addr) => match resolve_finalizer_address(lightclient, addr).await {
                        Ok(address) => address,
                        Err(e) => return e,
                    },
                    None => return "Error: Missing new finalizer".to_string(),
                };

                let propose = match lightclient
                    .propose_retarget_bond(bond_key, new_finalizer_address, AccountId::ZERO)
                    .await
                {
                    Ok(proposal) => match total_fee(&proposal.proportional_fee_proposal()) {
                        Ok(fee) => Propose::fee(fee.into_u64()),
                        Err(e) => Propose::error(e),
                    },
                    Err(e) => Propose::error(e),
                };
                to_json(&propose)
            }))
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

async fn resolve_finalizer_address(
    lightclient: &LightClient,
    encoded: &str,
) -> Result<FinalizerAddress, String> {
    if let Ok(address) = parse_finalizer_address(encoded) {
        return Ok(address);
    }
    let pub_key = parse_hex_32(encoded)?;
    let roster = lightclient
        .get_roster_info()
        .await
        .map_err(|e| format!("Error: {e}"))?;
    roster
        .members
        .into_iter()
        .find(|member| member.pub_key == pub_key)
        .and_then(|member| member.finalizer_address)
        .ok_or_else(|| "Error: the roster carries no address for this finalizer".to_string())
}

fn parse_hex_32(s: &str) -> Result<[u8; 32], String> {
    let bytes = Vec::from_hex(s).map_err(|e| format!("Error: invalid 32-byte hex string: {e}"))?;
    if bytes.len() != 32 {
        return Err("Error: stakingAction target/source must be 32 bytes".to_string());
    }
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&bytes);
    Ok(arr)
}

#[uniffi::export]
pub fn confirm() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;
        if let Some(lightclient) = &mut *guard {
            Ok(RT.block_on(async move {
                let confirm = match lightclient.send_stored_proposal(true).await {
                    Ok(txids) => {
                        Confirm::txids(txids.iter().map(|txid| txid.to_string()).collect())
                    }
                    Err(e) => Confirm::error(e),
                };
                to_json(&confirm)
            }))
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

// #[uniffi::export]
// pub fn get_accumulated_stake_for_txid(txid: String) -> Result<u64, ZingolibError> {
//     with_panic_guard(|| {
//         let mut guard = LIGHTCLIENT
//             .write()
//             .map_err(|_| ZingolibError::LightclientLockPoisoned)?;
//         if let Some(lightclient) = &mut *guard {
//             let txid = match txid_from_hex_encoded_str(&txid) {
//                 Ok(txid) => txid,
//                 Err(_e) => return Ok(0),
//             };
//             Ok(RT.block_on(async move {
//                 lightclient
//                     .get_accumulated_stake_for_txid(txid.into())
//                     .await
//             }))
//         } else {
//             Err(ZingolibError::LightclientNotInitialized)
//         }
//     })
// }

#[uniffi::export]
pub fn get_wallet_bonds() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let mut guard = LIGHTCLIENT
            .write()
            .map_err(|_| ZingolibError::LightclientLockPoisoned)?;
        if let Some(lightclient) = &mut *guard {
            Ok(RT.block_on(async move {
                match lightclient.get_wallet_bonds().await {
                    Ok(bonds) => to_json(&WalletBonds::from(bonds)),
                    Err(e) => format!("Error: {e}"),
                }
            }))
        } else {
            Err(ZingolibError::LightclientNotInitialized)
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const REGTEST_UA: &str = "uregtest1vgzs0rxfeusg0yjlsj6p7f4v37c2w3xaezunn7a08rvexwz52uurck2w8kved3jwnqsyfa5ryz3s2rp320ue92g78c4c6y8agqlcjp4h";

    #[test]
    fn make_decoded_chain_pair_selects_regtest_for_regtest_address() {
        let result = make_decoded_chain_pair(REGTEST_UA);

        match result {
            Some((_addr, chain_type)) => {
                assert!(
                    matches!(chain_type, ChainType::Regtest(_)),
                    "expected Regtest chain, got: {:?}",
                    chain_type
                );
            }
            None => panic!("make_decoded_chain_pair returned None for valid regtest UA"),
        }
    }

    #[test]
    fn parse_address_returns_unified_regtest_json() {
        let json_str = parse_address(REGTEST_UA.to_string())
            .expect("parse_address returned an error for valid regtest UA");

        let value = json::parse(&json_str).expect("parse_address did not return valid JSON");

        assert_eq!(value["status"], "success");
        assert_eq!(value["chain_name"], "regtest");
        assert_eq!(value["address_kind"], "unified");
        assert!(value["receivers_available"].is_array());
        assert!(
            value["receivers_available"].len() >= 1,
            "expected at least one receiver in receivers_available"
        );
    }

    #[test]
    #[ignore = "needs the network"]
    fn discovery_ranks_live_featurenet_indexers() {
        reset_lightclient();
        let report = json::parse(&discover_indexers("stable".to_string()).unwrap()).unwrap();
        println!("{}", report.pretty(2));
        assert!(!report["indexers"].is_empty(), "no indexer answered");
        let first = report["indexers"][0]["uri"].as_str().unwrap().to_string();
        let probe =
            json::parse(&probe_indexer(first.clone(), "stable".to_string()).unwrap()).unwrap();
        println!("{}", probe.pretty(2));
        assert_eq!(probe["indexers"][0]["uri"].as_str(), Some(first.as_str()));
    }

    #[test]
    #[ignore = "needs the network"]
    fn discovery_on_nightly_needs_the_word_nightly() {
        reset_lightclient();
        let stable = json::parse(&discover_indexers("stable".to_string()).unwrap()).unwrap();
        let nightly = json::parse(&discover_indexers("nightly".to_string()).unwrap()).unwrap();
        let default = json::parse(&discover_indexers("garbage".to_string()).unwrap()).unwrap();
        println!("stable {}", stable.pretty(2));
        println!("nightly {}", nightly.pretty(2));
        let uris = |report: &json::JsonValue| {
            report["indexers"]
                .members()
                .map(|i| i["uri"].as_str().unwrap().to_string())
                .collect::<Vec<_>>()
        };
        assert!(!uris(&stable).is_empty(), "no stable indexer answered");
        assert_eq!(
            uris(&stable),
            uris(&default),
            "anything not nightly is stable"
        );
        assert!(
            uris(&stable)
                .iter()
                .all(|uri| !uris(&nightly).contains(uri)),
            "the stable and nightly lists must not mix"
        );
        for error in nightly["errors"].members() {
            println!("nightly error: {error}");
        }
    }

    #[test]
    #[ignore = "needs the network"]
    fn the_nightly_seed_list_is_probed_and_the_answers_are_visible() {
        let _ = set_crypto_default_provider_to_ring();
        let config = discovery_config("nightly");
        let uris: Vec<(String, discovery::Source)> = config
            .seed_uris
            .iter()
            .map(|uri| (uri.clone(), discovery::Source::Builtin))
            .collect();
        let report = RT.block_on(async { discovery::health_check(&config, uris, None).await });
        for indexer in &report.ranking {
            println!(
                "{} answered={} chain={:?} branch={:?} tip={:?} age={:?} in {:?}",
                indexer.uri,
                indexer.tip_height.is_some(),
                indexer.chain_name,
                indexer.consensus_branch,
                indexer.tip_height,
                indexer.tip_age_secs,
                indexer.latency
            );
        }
        println!("errors: {:?}", report.errors);
        assert!(
            !report.ranking.is_empty(),
            "the nightly seeds must at least be probed"
        );
    }

    #[test]
    #[ignore = "needs the network"]
    fn select_best_indexer_moves_to_the_highest_tip_on_the_wallets_chain() {
        let _ = set_crypto_default_provider_to_ring();
        let init = init_from_seed(
            "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
                .to_string(),
            1,
            "http://45.63.75.9:18234".to_string(),
            "test".to_string(),
            "Medium".to_string(),
            1,
        );
        println!("init: {init:?}");
        let opened = match init {
            Ok(opened) => opened,
            Err(e) => {
                println!("init error: {e:?}");
                panic!("init_from_seed failed");
            }
        };
        assert!(
            !opened.to_lowercase().starts_with("error"),
            "init_from_seed error: {opened}"
        );
        let chosen = select_best_indexer("stable".to_string()).unwrap_or_else(|e| {
            println!("select error: {e:?}");
            String::new()
        });
        println!("chosen: {chosen}");
        assert!(!chosen.is_empty(), "select_best_indexer failed");
        assert!(!chosen.to_lowercase().starts_with("error"), "{chosen}");
        assert_eq!(chosen, "http://88.198.67.189:18234/");
    }

    #[test]
    fn the_stable_list_is_the_default_and_nightly_stays_separate() {
        let stable = discovery_config("stable");
        let nightly = discovery_config("nightly");
        let other = discovery_config("mainnet");
        let empty = discovery_config("");
        assert!(!stable.seed_uris.is_empty());
        assert!(!nightly.seed_uris.is_empty());
        assert_eq!(other.seed_uris, stable.seed_uris);
        assert_eq!(empty.seed_uris, stable.seed_uris);
        assert_ne!(stable.seed_uris, nightly.seed_uris);
        assert!(
            stable
                .seed_uris
                .iter()
                .all(|uri| !nightly.seed_uris.contains(uri)),
            "the stable and nightly seed lists must not mix"
        );
        assert!(stable.expected_branch.is_some());
        assert!(nightly.expected_branch.is_some());
    }

    #[test]
    #[ignore = "needs the network"]
    fn inspect_wallet_tells_the_chains_apart() {
        let _ = set_crypto_default_provider_to_ring();
        let seed = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about".to_string();
        init_from_seed(
            seed.clone(),
            1,
            "http://88.198.67.189:18234".to_string(),
            "test".to_string(),
            "Medium".to_string(),
            1,
        )
        .unwrap();
        run_sync().unwrap();
        for _ in 0..60 {
            let status = status_sync().unwrap();
            let json = json::parse(&status).unwrap_or(json::JsonValue::Null);
            let scanned = json["percentage_total_blocks_scanned"]
                .as_f64()
                .unwrap_or(0.0);
            if scanned > 0.0 {
                break;
            }
            std::thread::sleep(std::time::Duration::from_secs(5));
        }
        let b64 = save_to_b64().unwrap();
        let stable = json::parse(
            &inspect_wallet(
                b64.clone(),
                "http://88.198.67.189:18234".to_string(),
                "android".to_string(),
            )
            .unwrap(),
        )
        .unwrap();
        let nightly = json::parse(
            &inspect_wallet(
                b64,
                "http://45.32.186.234:18234".to_string(),
                "android".to_string(),
            )
            .unwrap(),
        )
        .unwrap();
        println!("stable: {stable}");
        println!("nightly: {nightly}");
        assert_eq!(stable["readable"], true);
        assert_ne!(stable["chain_match"], false, "stable blocks must match");
        assert_eq!(
            nightly["chain_match"], false,
            "stable blocks must not be on nightly"
        );
    }

    #[test]
    fn select_best_indexer_needs_a_wallet_and_reports_a_dead_network_as_error() {
        reset_lightclient();
        let no_wallet = select_best_indexer("stable".to_string()).unwrap_err();
        assert!(
            matches!(no_wallet, ZingolibError::LightclientNotInitialized),
            "expected LightclientNotInitialized, got: {no_wallet:?}"
        );
    }

    #[test]
    fn wallet_bytes_takes_both_platform_encodings() {
        let mut binary = vec![];
        binary.extend_from_slice(&40u64.to_le_bytes());
        binary.extend_from_slice(b"wallet bytes go here");
        assert!(wallet_bytes(&binary).is_some());
        let as_text = STANDARD.encode(&binary);
        assert!(wallet_bytes(as_text.as_bytes()).is_some());
        let garbage = b"this is not a wallet file at all";
        assert!(wallet_bytes(garbage).is_none());
    }

    #[test]
    #[ignore = "needs the network"]
    fn a_fresh_wallet_syncs_on_the_live_featurenet() {
        let dir = std::env::temp_dir().join(format!("delegator-sync-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let _ = set_crypto_default_provider_to_ring();
        let seed = init_new(
            "http://88.198.67.189:18234".to_string(),
            "test".to_string(),
            "Medium".to_string(),
            1,
        )
        .unwrap();
        println!("init: {seed}");
        assert!(!seed.to_lowercase().starts_with("error"), "{seed}");
        println!("sync: {}", run_sync().unwrap());
        for _ in 0..18 {
            std::thread::sleep(std::time::Duration::from_secs(5));
            let status = status_sync().unwrap();
            let json = json::parse(&status).unwrap_or(json::JsonValue::Null);
            println!(
                "status: ranges={} blocks={}% outputs={}% poll={}",
                json["scan_ranges"].len(),
                json["percentage_total_blocks_scanned"],
                json["percentage_total_outputs_scanned"],
                poll_sync().unwrap()
            );
        }
        println!("{}", get_latest_block_wallet().unwrap());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn panic_in_one_ffi_call_leaks_into_the_next_call() {
        reset_lightclient();

        let first = with_panic_guard(|| {
            with_lightclient_write(|_slot| -> Result<(), ZingolibError> {
                panic!("boom while holding LIGHTCLIENT");
            })
        });

        assert!(
            matches!(first, Err(ZingolibError::Panic(_))),
            "expected first FFI-style call to be converted into Panic error, got: {first:?}"
        );

        let second = with_lightclient_read(|_lightclient| Ok::<_, ZingolibError>(()));

        assert!(
            matches!(second, Err(ZingolibError::LightclientNotInitialized)),
            "expected follow-up call to fail after prior panic affected shared global state, got: {second:?}"
        );
    }

    #[test]
    fn panic_while_holding_lightclient_lock_turns_future_calls_into_lock_poison_errors() {
        reset_lightclient();

        let first = with_panic_guard(|| {
            let _guard = LIGHTCLIENT
                .write()
                .map_err(|_| ZingolibError::LightclientLockPoisoned)?;

            panic!("panic while holding LIGHTCLIENT write lock");
            #[allow(unreachable_code)]
            Ok::<(), ZingolibError>(())
        });

        assert!(
            matches!(first, Err(ZingolibError::Panic(_))),
            "expected panic to be converted into FFI-facing Panic error, got: {first:?}"
        );

        let second = LIGHTCLIENT
            .read()
            .map_err(|_| ZingolibError::LightclientLockPoisoned);

        assert!(
            matches!(second, Err(ZingolibError::LightclientLockPoisoned)),
            "expected subsequent lock acquisition to fail with poison, got: {second:?}"
        );
    }

    #[test]
    fn poisoned_outer_lock_can_be_recovered_without_reinitializing_wallet() {
        reset_lightclient();

        let first = with_panic_guard(|| {
            let _guard = LIGHTCLIENT
                .write()
                .map_err(|_| ZingolibError::LightclientLockPoisoned)?;

            panic!("panic while holding LIGHTCLIENT write lock");
            #[allow(unreachable_code)]
            Ok::<(), ZingolibError>(())
        });

        assert!(matches!(first, Err(ZingolibError::Panic(_))));

        let recovered = with_lightclient_write(|slot| {
            let _ = slot.as_ref();
            Ok::<(), ZingolibError>(())
        });

        assert!(
            recovered.is_ok(),
            "expected helper to recover poisoned outer lock instead of forcing reinit, got: {recovered:?}"
        );
    }

    #[test]
    fn outer_lock_poison_does_not_require_wallet_reinit_for_read_calls() {
        reset_lightclient();

        // Real client init, no reload after this.
        let init = init_from_seed(
            "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
                .to_string(),
            1,
            "".to_string(),
            "regtest".to_string(),
            "Medium".to_string(),
            1,
        );

        assert!(
            init.is_ok(),
            "expected init_from_seed to succeed, got: {init:?}"
        );

        // Provoke a panic while the outer global lock is held.
        let panicked = with_panic_guard(|| {
            let _guard = LIGHTCLIENT
                .write()
                .map_err(|_| ZingolibError::LightclientLockPoisoned)?;

            panic!("intentional panic while holding LIGHTCLIENT");
            #[allow(unreachable_code)]
            Ok::<(), ZingolibError>(())
        });

        assert!(
            matches!(panicked, Err(ZingolibError::Panic(_))),
            "expected panic to be converted into ZingolibError::Panic, got: {panicked:?}"
        );

        // the wallet should still be usable without reinit because helper-based
        // poison recovery should recover the outer lock.
        let seed_after = get_seed();

        assert!(
            seed_after.is_ok(),
            "expected get_seed() to succeed after poison recovery without reinit, got: {seed_after:?}"
        );

        let seed_json = seed_after.unwrap();
        assert!(
            !seed_json.starts_with("Error:"),
            "expected recovery info, got: {seed_json}"
        );
    }
}
#[cfg(test)]
mod nightly_wallet_maker {
    use super::*;

    /// Mints a wallet file whose synced blocks belong to the nightly chain.
    #[test]
    #[ignore = "needs the network"]
    fn make_a_nightly_wallet_file() {
        let _ = set_crypto_default_provider_to_ring();
        init_from_seed(
            "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
                .to_string(),
            9700,
            "http://45.32.186.234:18234".to_string(),
            "test".to_string(),
            "Medium".to_string(),
            1,
        )
        .unwrap();
        run_sync().unwrap();
        for _ in 0..36 {
            let status = status_sync().unwrap();
            let json = json::parse(&status).unwrap_or(json::JsonValue::Null);
            let pct = json["percentage_total_blocks_scanned"]
                .as_f64()
                .unwrap_or(0.0);
            println!("scanned {pct}%");
            if pct >= 100.0 {
                break;
            }
            std::thread::sleep(std::time::Duration::from_secs(5));
        }
        let b64 = save_to_b64().unwrap();
        std::fs::write("/tmp/nightly_wallet.b64", &b64).unwrap();
        println!("nightly wallet written: {} bytes", b64.len());
    }
}
#[cfg(test)]
mod old_chain_probe {
    use super::*;

    #[test]
    #[ignore = "needs the network"]
    fn old_testnet_indexer_is_alive() {
        let _ = set_crypto_default_provider_to_ring();
        let uri: http::Uri = "https://testnet.zec.rocks:443".parse().unwrap();
        let tip = RT
            .block_on(async move { zingolib::grpc_connector::get_latest_block(uri.clone()).await })
            .expect("tip");
        let height = u32::try_from(tip.height).unwrap();
        let birthday = height.saturating_sub(100);
        init_from_seed(
            "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
                .to_string(),
            birthday,
            "https://testnet.zec.rocks:443".to_string(),
            "test".to_string(),
            "Medium".to_string(),
            1,
        )
        .unwrap();
        run_sync().unwrap();
        for _ in 0..36 {
            let status = status_sync().unwrap();
            let json = json::parse(&status).unwrap_or(json::JsonValue::Null);
            let pct = json["percentage_total_blocks_scanned"]
                .as_f64()
                .unwrap_or(0.0);
            println!("scanned {pct}%");
            if pct >= 100.0 {
                break;
            }
            std::thread::sleep(std::time::Duration::from_secs(5));
        }
        let b64 = save_to_b64().unwrap();
        std::fs::write("/tmp/oldtestnet_wallet.b64", &b64).unwrap();
        println!(
            "legacy wallet written: {} bytes, birthday {birthday}, tip {height}",
            b64.len()
        );
        let inspect = inspect_wallet(
            b64,
            "http://88.198.67.189:18234".to_string(),
            "android".to_string(),
        )
        .unwrap();
        println!("inspect vs stable: {inspect}");
    }
}

#[cfg(test)]
mod inspect_probe {
    use super::*;

    #[test]
    #[ignore = "needs the network"]
    fn inspect_the_planted_wallet() {
        let _ = set_crypto_default_provider_to_ring();
        let data = std::fs::read_to_string("/tmp/ios_wallet.dat").unwrap();
        let out = inspect_wallet(
            data,
            "http://88.198.67.189:18234".to_string(),
            "ios".to_string(),
        )
        .unwrap();
        println!("inspect: {out}");
    }
}
