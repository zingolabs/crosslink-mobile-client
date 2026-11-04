uniffi::setup_scaffolding!();

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
use std::path::PathBuf;
use std::str::FromStr;
use std::sync::Mutex;
use std::sync::Once;
use std::sync::RwLock;

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
    Ufvk, UnifiedAddress, ValueTransfers, WalletBonds, WalletFileRecoveryInfo, WalletHeight,
    WalletInfo, WalletKeyKind, WalletKind, WalletSaveRequired, WalletVersion, WithdrawStake,
    ZecPrice, to_json,
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

            #[cfg(test)]
            eprintln!("panic: {payload} at {file:?}:{line:?}:{col:?}");

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

const WALLET_FILE_NAME: &str = "wallet.dat";
const IOS_WALLET_FILE_NAME: &str = "wallet.dat.txt";

fn chain_from_hint(chain_hint: &str) -> Result<ChainType, String> {
    match chain_hint {
        "main" => chain_from_str("mainnet"),
        "test" => chain_from_str("testnet"),
        "regtest" => chain_from_str("regtest"),
        _ => return Err("Error: Not a valid chain hint!".to_string()),
    }
    .map_err(|e| format!("Error: {e}"))
}

/// Renames the file name the iOS app used to write, once, so zingolib only ever sees
/// `wallet.dat`. The content is left as it is; the reader sniffs it.
fn migrate_legacy_file_name(config: &ZingoConfig) -> std::io::Result<()> {
    let legacy = config.get_zingo_wallet_dir().join(IOS_WALLET_FILE_NAME);
    let current = config.get_wallet_pathbuf();
    if legacy.exists() && !current.exists() {
        std::fs::rename(&legacy, &current)?;
    }
    Ok(())
}

/// A config that only knows where the wallet files live, for the file operations that
/// need no client.
fn wallet_file_config(wallet_dir: &str) -> ZingoConfig {
    let mut config = ZingoConfig::build(stable_chain())
        .set_wallet_dir(PathBuf::from(wallet_dir))
        .create();
    config.wallet_name = PathBuf::from(WALLET_FILE_NAME);
    if let Err(e) = migrate_legacy_file_name(&config) {
        log::warn!("legacy wallet file rename failed: {e}");
    }
    config
}

fn file_operation_result(result: std::io::Result<()>, missing: &str) -> String {
    match result {
        Ok(()) => "true".to_string(),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => format!("Error: {missing}"),
        Err(e) => format!("Error: {e}"),
    }
}

fn construct_uri_load_config(
    wallet_dir: String,
    uri: String,
    chain_hint: String,
    performance_level: String,
    min_confirmations: u32,
) -> Result<(ZingoConfig, http::Uri), String> {
    // if uri is empty -> Offline Mode.
    let lightwalletd_uri = construct_lightwalletd_uri(Some(uri));

    let chaintype = chain_from_hint(&chain_hint)?;
    let performancetype = match performance_level.as_str() {
        "Maximum" => PerformanceLevel::Maximum,
        "High" => PerformanceLevel::High,
        "Medium" => PerformanceLevel::Medium,
        "Low" => PerformanceLevel::Low,
        _ => return Err("Error: Not a valid performance level!".to_string()),
    };
    let config = match zingolib::config::load_clientconfig(
        lightwalletd_uri.clone(),
        Some(PathBuf::from(wallet_dir)),
        chaintype,
        WalletSettings {
            sync_config: SyncConfig {
                transparent_address_discovery: TransparentAddressDiscovery::minimal(),
                performance_level: performancetype,
            },
            min_confirmations: NonZeroU32::try_from(min_confirmations).unwrap(),
        },
        NonZeroU32::try_from(1).expect("hard-coded integer"),
        WALLET_FILE_NAME.to_string(),
    ) {
        Ok(c) => c,
        Err(e) => {
            return Err(format!("Error: Config load: {e}"));
        }
    };

    Ok((config, lightwalletd_uri))
}

fn store_saved_client(lightclient: LightClient) -> Result<(), String> {
    match RT.block_on(lightclient.save_to_disk()) {
        Ok(_) => {}
        Err(e) => return Err(format!("Error: {e}")),
    }
    let _ = store_client(lightclient);
    Ok(())
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
    wallet_dir: String,
    server_uri: String,
    chain_hint: String,
    performance_level: String,
    min_confirmations: u32,
) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        reset_lightclient();
        let (config, _lightwalletd_uri) = match construct_uri_load_config(
            wallet_dir,
            server_uri,
            chain_hint,
            performance_level,
            min_confirmations,
        ) {
            Ok(c) => c,
            Err(e) => return Ok(e),
        };
        // Offline: a fresh wallet needs no indexer contact. Its birthday is the
        // chain's Sapling activation height, so the first online sync scans the
        // whole shielded history but the wallet is correct regardless of which
        // note commitment tree state the indexer later serves.
        let lightclient =
            match LightClient::new_offline(config, true, SeedDerivation::Zip32Standard) {
                Ok(l) => l,
                Err(e) => return Ok(format!("Error: {e}")),
            };
        if let Err(e) = store_saved_client(lightclient) {
            return Ok(e);
        }

        get_seed()
    })
}

// TODO: change `seed` to `seed_phrase` or `mnemonic_phrase`
#[uniffi::export]
pub fn init_from_seed(
    wallet_dir: String,
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
            wallet_dir,
            server_uri,
            chain_hint,
            performance_level,
            min_confirmations,
        ) {
            Ok(c) => c,
            Err(e) => return Ok(e),
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
        let lightclient = match LightClient::create_from_wallet(wallet, config, true) {
            Ok(l) => l,
            Err(e) => return Ok(format!("Error: {e}")),
        };
        if let Err(e) = store_saved_client(lightclient) {
            return Ok(e);
        }

        get_seed()
    })
}

/// Opens `wallet.dat` inside `wallet_dir`. A file in the legacy iOS shape (base64 text,
/// possibly still named `wallet.dat.txt`) opens as well and is rewritten raw on the next save.
#[uniffi::export]
pub fn init_from_file(
    wallet_dir: String,
    server_uri: String,
    chain_hint: String,
    performance_level: String,
    min_confirmations: u32,
) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        reset_lightclient();
        let (config, _lightwalletd_uri) = match construct_uri_load_config(
            wallet_dir,
            server_uri,
            chain_hint,
            performance_level,
            min_confirmations,
        ) {
            Ok(c) => c,
            Err(e) => return Ok(e),
        };
        if let Err(e) = migrate_legacy_file_name(&config) {
            return Ok(format!("Error: {e}"));
        }
        let (wallet, _shape) = match LightWallet::open_file(&config.get_wallet_path(), config.chain)
        {
            Ok(opened) => opened,
            Err(e) => return Ok(format!("Error: {e}")),
        };
        let lightclient = match LightClient::create_from_wallet(wallet, config, true) {
            Ok(l) => l,
            Err(e) => return Ok(format!("Error: {e}")),
        };
        let has_seed = RT.block_on(async { lightclient.wallet.read().await.mnemonic().is_some() });
        let _ = store_client(lightclient);

        if has_seed { get_seed() } else { get_ufvk() }
    })
}

/// Writes the wallet to its file when something changed. Answers `"true"` when a file was
/// written, `"false"` when nothing needed saving.
#[uniffi::export]
pub fn save_wallet() -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        with_lightclient_read(|lightclient| {
            Ok(match RT.block_on(lightclient.save_to_disk()) {
                Ok(true) => "true".to_string(),
                Ok(false) => "false".to_string(),
                Err(e) => format!("Error: {e}"),
            })
        })
    })
}

#[uniffi::export]
pub fn wallet_exists(wallet_dir: String) -> Result<bool, ZingolibError> {
    with_panic_guard(|| Ok(wallet_file_config(&wallet_dir).wallet_path_exists()))
}

/// Reads the seed phrase (or the viewing key of a seedless wallet) and the birthday from the
/// front of the wallet file, so a user can restore even when the rest of the file is damaged
/// or belongs to another chain. Answers JSON or `"Error: wallet file ..."`.
#[uniffi::export]
pub fn read_wallet_recovery_info(
    wallet_dir: String,
    chain_hint: String,
) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        let chain = match chain_from_hint(&chain_hint) {
            Ok(chain) => chain,
            Err(e) => return Ok(e),
        };
        let path = wallet_file_config(&wallet_dir).get_wallet_pathbuf();
        Ok(
            match LightWallet::read_recovery_info_from_path(&path, chain) {
                Ok(info) => to_json(&WalletFileRecoveryInfo::from(info)),
                Err(e) => format!("Error: {e}"),
            },
        )
    })
}

#[uniffi::export]
pub fn delete_wallet(wallet_dir: String) -> Result<String, ZingolibError> {
    with_panic_guard(|| {
        Ok(file_operation_result(
            wallet_file_config(&wallet_dir).remove_wallet_file(),
            "wallet file not found",
        ))
    })
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
static GLOBAL_CLIENT_TEST_LOCK: Mutex<()> = Mutex::new(());

#[cfg(test)]
fn global_client_test_lock() -> std::sync::MutexGuard<'static, ()> {
    GLOBAL_CLIENT_TEST_LOCK
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
}

#[cfg(test)]
fn temp_wallet_dir(tag: &str) -> tempfile::TempDir {
    tempfile::Builder::new()
        .prefix(&format!("delegator-{tag}-"))
        .tempdir()
        .expect("temp dir")
}

#[cfg(test)]
fn dir_string(dir: &tempfile::TempDir) -> String {
    dir.path().to_string_lossy().into_owned()
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
        let _guard = global_client_test_lock();
        let _ = set_crypto_default_provider_to_ring();
        let dir = temp_wallet_dir("select");
        let init = init_from_seed(
            dir_string(&dir),
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
    fn select_best_indexer_needs_a_wallet_and_reports_a_dead_network_as_error() {
        let _guard = global_client_test_lock();
        reset_lightclient();
        let no_wallet = select_best_indexer("stable".to_string()).unwrap_err();
        assert!(
            matches!(no_wallet, ZingolibError::LightclientNotInitialized),
            "expected LightclientNotInitialized, got: {no_wallet:?}"
        );
    }

    #[test]
    #[ignore = "needs the network"]
    fn a_fresh_wallet_syncs_on_the_live_featurenet() {
        let _guard = global_client_test_lock();
        let dir = temp_wallet_dir("sync");
        let _ = set_crypto_default_provider_to_ring();
        let seed = init_new(
            dir_string(&dir),
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
    }

    #[test]
    fn panic_in_one_ffi_call_leaks_into_the_next_call() {
        let _guard = global_client_test_lock();
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
        let _guard = global_client_test_lock();
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
        let _guard = global_client_test_lock();
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
        let _guard = global_client_test_lock();
        reset_lightclient();

        // Real client init, no reload after this.
        let dir = temp_wallet_dir("poison");
        let init = init_from_seed(
            dir_string(&dir),
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
        let _guard = global_client_test_lock();
        let _ = set_crypto_default_provider_to_ring();
        let dir = std::env::temp_dir().join("nightly_wallet");
        std::fs::create_dir_all(&dir).unwrap();
        init_from_seed(
            dir.to_string_lossy().into_owned(),
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
        println!("save: {}", save_wallet().unwrap());
        println!("nightly wallet written under {}", dir.display());
    }
}
#[cfg(test)]
mod old_chain_probe {
    use super::*;

    #[test]
    #[ignore = "needs the network"]
    fn old_testnet_indexer_is_alive() {
        let _guard = global_client_test_lock();
        let _ = set_crypto_default_provider_to_ring();
        let uri: http::Uri = "https://testnet.zec.rocks:443".parse().unwrap();
        let tip = RT
            .block_on(async move { zingolib::grpc_connector::get_latest_block(uri.clone()).await })
            .expect("tip");
        let height = u32::try_from(tip.height).unwrap();
        let birthday = height.saturating_sub(100);
        let dir = std::env::temp_dir().join("oldtestnet_wallet");
        std::fs::create_dir_all(&dir).unwrap();
        init_from_seed(
            dir.to_string_lossy().into_owned(),
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
        println!("save: {}", save_wallet().unwrap());
        println!(
            "legacy wallet written under {}, birthday {birthday}, tip {height}",
            dir.display()
        );
    }
}

#[cfg(test)]
mod wallet_file_tests {
    use base64::Engine as _;
    use base64::engine::general_purpose::STANDARD;

    use super::*;

    const SEED_A: &str = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    const SEED_B: &str = "hospital museum valve antique skate museum unfold vocal weird milk scale social vessel identify crowd hospital control album rib bulb path oven civil tank";

    fn open_offline(dir: &str) -> String {
        let out = init_from_file(
            dir.to_string(),
            String::new(),
            "regtest".to_string(),
            "Medium".to_string(),
            1,
        )
        .unwrap();
        assert!(!out.starts_with("Error:"), "{out}");
        out
    }

    fn create_offline(dir: &str, seed: &str) -> String {
        let out = init_from_seed(
            dir.to_string(),
            seed.to_string(),
            1,
            String::new(),
            "regtest".to_string(),
            "Medium".to_string(),
            1,
        )
        .unwrap();
        assert!(!out.starts_with("Error:"), "{out}");
        out
    }

    fn seed_phrase(seed_json: &str) -> String {
        json::parse(seed_json).unwrap()["seed_phrase"]
            .as_str()
            .unwrap()
            .to_string()
    }

    fn addresses() -> (String, String) {
        (
            get_unified_addresses().unwrap(),
            get_transparent_addresses().unwrap(),
        )
    }

    fn mark_wallet_dirty() {
        with_lightclient_read(|lightclient| {
            RT.block_on(async { lightclient.wallet.write().await.save_required = true });
            Ok(())
        })
        .unwrap();
    }

    fn raw_wallet_fixture() -> Vec<u8> {
        let dir = temp_wallet_dir("fixture");
        create_offline(&dir_string(&dir), SEED_A);
        reset_lightclient();
        std::fs::read(dir.path().join(WALLET_FILE_NAME)).unwrap()
    }

    fn is_raw_wallet(bytes: &[u8]) -> bool {
        bytes.len() > 8 && bytes[..8] == LightWallet::serialized_version().to_le_bytes()
    }

    #[test]
    fn round_trip_through_the_file_keeps_seed_and_addresses() {
        let _guard = global_client_test_lock();
        let dir = temp_wallet_dir("roundtrip");
        let dir_str = dir_string(&dir);

        let created = create_offline(&dir_str, SEED_A);
        assert!(dir.path().join(WALLET_FILE_NAME).exists());
        assert_eq!(wallet_exists(dir_str.clone()).unwrap(), true);
        assert_eq!(save_wallet().unwrap(), "false");

        let new_address = create_new_unified_address("oz".to_string()).unwrap();
        assert!(!new_address.starts_with("Error:"), "{new_address}");
        mark_wallet_dirty();
        assert_eq!(save_wallet().unwrap(), "true");
        let before = addresses();

        reset_lightclient();
        let opened = open_offline(&dir_str);
        assert_eq!(seed_phrase(&opened), seed_phrase(&created));
        assert_eq!(seed_phrase(&opened), SEED_A);
        assert_eq!(addresses(), before);
        assert_eq!(json::parse(&before.0).unwrap().len(), 2);
        assert_eq!(save_wallet().unwrap(), "false");
        assert!(is_raw_wallet(
            &std::fs::read(dir.path().join(WALLET_FILE_NAME)).unwrap()
        ));
    }

    #[test]
    fn legacy_ios_shape_is_renamed_opened_and_rewritten_raw() {
        let _guard = global_client_test_lock();
        let fixture = raw_wallet_fixture();
        let dir = temp_wallet_dir("ios");
        let dir_str = dir_string(&dir);
        let text = STANDARD.encode(&fixture);
        std::fs::write(dir.path().join(IOS_WALLET_FILE_NAME), text.as_bytes()).unwrap();

        assert_eq!(wallet_exists(dir_str.clone()).unwrap(), true);
        assert!(dir.path().join(WALLET_FILE_NAME).exists());
        assert!(!dir.path().join(IOS_WALLET_FILE_NAME).exists());
        assert_eq!(
            std::fs::read(dir.path().join(WALLET_FILE_NAME)).unwrap(),
            text.as_bytes()
        );

        let opened = open_offline(&dir_str);
        assert_eq!(seed_phrase(&opened), SEED_A);
        assert_eq!(save_wallet().unwrap(), "true");
        let rewritten = std::fs::read(dir.path().join(WALLET_FILE_NAME)).unwrap();
        assert!(is_raw_wallet(&rewritten));
        assert!(rewritten.len() < text.len());
        assert_eq!(save_wallet().unwrap(), "false");
        let (_, shape) = LightWallet::read_from_path(
            &dir.path().join(WALLET_FILE_NAME),
            chain_from_hint("regtest").unwrap(),
        )
        .unwrap();
        assert_eq!(shape, zingolib::wallet::disk::WalletFileShape::Raw);
    }

    #[test]
    fn legacy_ios_shape_already_named_wallet_dat_opens_too() {
        let _guard = global_client_test_lock();
        let fixture = raw_wallet_fixture();
        let dir = temp_wallet_dir("ios-named");
        std::fs::write(dir.path().join(WALLET_FILE_NAME), STANDARD.encode(&fixture)).unwrap();

        let opened = open_offline(&dir_string(&dir));
        assert_eq!(seed_phrase(&opened), SEED_A);
        assert_eq!(save_wallet().unwrap(), "true");
        assert!(is_raw_wallet(
            &std::fs::read(dir.path().join(WALLET_FILE_NAME)).unwrap()
        ));
    }

    #[test]
    fn legacy_android_shape_opens_with_no_rewrite() {
        let _guard = global_client_test_lock();
        let fixture = raw_wallet_fixture();
        let dir = temp_wallet_dir("android");
        let path = dir.path().join(WALLET_FILE_NAME);
        std::fs::write(&path, &fixture).unwrap();
        let modified_before = std::fs::metadata(&path).unwrap().modified().unwrap();

        let opened = open_offline(&dir_string(&dir));
        assert_eq!(seed_phrase(&opened), SEED_A);
        assert_eq!(save_wallet().unwrap(), "false");
        assert_eq!(std::fs::read(&path).unwrap(), fixture);
        assert_eq!(
            std::fs::metadata(&path).unwrap().modified().unwrap(),
            modified_before
        );
        assert!(!dir.path().join("wallet.dat.tmp").exists());
    }

    #[test]
    fn delete_removes_the_file_and_missing_files_are_stable_errors() {
        let _guard = global_client_test_lock();
        let dir = temp_wallet_dir("delete");
        let dir_str = dir_string(&dir);
        let wallet_path = dir.path().join(WALLET_FILE_NAME);

        assert_eq!(
            delete_wallet(dir_str.clone()).unwrap(),
            "Error: wallet file not found"
        );

        create_offline(&dir_str, SEED_A);
        assert!(wallet_path.exists());
        assert_eq!(delete_wallet(dir_str.clone()).unwrap(), "true");
        assert!(!wallet_path.exists());
        assert_eq!(wallet_exists(dir_str.clone()).unwrap(), false);
        assert_eq!(
            delete_wallet(dir_str.clone()).unwrap(),
            "Error: wallet file not found"
        );
    }

    const V39_TESTNET_WALLET: &[u8] = include_bytes!("test_binaries/wallet_v39_testnet.dat");

    fn open_testnet_offline(dir: &str) -> String {
        init_from_file(
            dir.to_string(),
            String::new(),
            "test".to_string(),
            "Medium".to_string(),
            1,
        )
        .unwrap()
    }

    #[test]
    fn a_wallet_written_by_the_april_release_opens_and_is_kept_as_is() {
        let _guard = global_client_test_lock();
        assert_eq!(&V39_TESTNET_WALLET[..8], 39u64.to_le_bytes());
        let dir = temp_wallet_dir("v39-android");
        let path = dir.path().join(WALLET_FILE_NAME);
        std::fs::write(&path, V39_TESTNET_WALLET).unwrap();

        let opened = open_testnet_offline(&dir_string(&dir));
        assert_eq!(seed_phrase(&opened), SEED_A);
        assert_eq!(save_wallet().unwrap(), "false");
        assert_eq!(std::fs::read(&path).unwrap(), V39_TESTNET_WALLET);

        mark_wallet_dirty();
        assert_eq!(save_wallet().unwrap(), "true");
        let rewritten = std::fs::read(&path).unwrap();
        assert!(is_raw_wallet(&rewritten));
        reset_lightclient();
        assert_eq!(
            seed_phrase(&open_testnet_offline(&dir_string(&dir))),
            SEED_A
        );
    }

    #[test]
    fn a_wallet_written_by_the_april_release_on_ios_opens_and_is_rewritten() {
        let _guard = global_client_test_lock();
        let dir = temp_wallet_dir("v39-ios");
        let text = STANDARD.encode(V39_TESTNET_WALLET);
        std::fs::write(dir.path().join(IOS_WALLET_FILE_NAME), text.as_bytes()).unwrap();

        assert_eq!(wallet_exists(dir_string(&dir)).unwrap(), true);
        assert!(!dir.path().join(IOS_WALLET_FILE_NAME).exists());

        let opened = open_testnet_offline(&dir_string(&dir));
        assert_eq!(seed_phrase(&opened), SEED_A);
        assert_eq!(save_wallet().unwrap(), "true");
        assert!(is_raw_wallet(
            &std::fs::read(dir.path().join(WALLET_FILE_NAME)).unwrap()
        ));
    }

    #[test]
    fn a_wallet_from_another_chain_does_not_open_and_is_left_in_place() {
        let _guard = global_client_test_lock();
        let dir = temp_wallet_dir("v39-chain");
        std::fs::write(dir.path().join(WALLET_FILE_NAME), V39_TESTNET_WALLET).unwrap();

        let opened = init_from_file(
            dir_string(&dir),
            String::new(),
            "regtest".to_string(),
            "Medium".to_string(),
            1,
        )
        .unwrap();
        assert!(opened.starts_with("Error:"), "{opened}");
        assert_eq!(
            std::fs::read(dir.path().join(WALLET_FILE_NAME)).unwrap(),
            V39_TESTNET_WALLET
        );
    }

    #[test]
    fn both_file_names_present_keeps_the_current_one() {
        let _guard = global_client_test_lock();
        let fixture = raw_wallet_fixture();
        let dir = temp_wallet_dir("both");
        std::fs::write(dir.path().join(WALLET_FILE_NAME), &fixture).unwrap();
        std::fs::write(dir.path().join(IOS_WALLET_FILE_NAME), b"stale").unwrap();

        let opened = open_offline(&dir_string(&dir));
        assert_eq!(seed_phrase(&opened), SEED_A);
        assert_eq!(
            std::fs::read(dir.path().join(WALLET_FILE_NAME)).unwrap(),
            fixture
        );
        assert_eq!(
            std::fs::read(dir.path().join(IOS_WALLET_FILE_NAME)).unwrap(),
            b"stale"
        );
    }

    fn recovery(dir: &str, chain: &str) -> json::JsonValue {
        let out = read_wallet_recovery_info(dir.to_string(), chain.to_string()).unwrap();
        json::parse(&out).unwrap_or_else(|_| json::JsonValue::String(out))
    }

    #[test]
    fn open_errors_name_the_problem_and_recovery_still_answers() {
        let _guard = global_client_test_lock();
        let dir = temp_wallet_dir("precise");
        let dir_str = dir_string(&dir);
        let path = dir.path().join(WALLET_FILE_NAME);
        let open = |chain: &str| {
            init_from_file(
                dir_str.clone(),
                String::new(),
                chain.to_string(),
                "Medium".to_string(),
                1,
            )
            .unwrap()
        };

        assert_eq!(open("regtest"), "Error: wallet file not found");
        assert_eq!(
            recovery(&dir_str, "regtest"),
            "Error: wallet file not found"
        );

        std::fs::write(&path, b"").unwrap();
        assert_eq!(open("regtest"), "Error: wallet file is empty");

        std::fs::write(&path, b"this is not a wallet file at all").unwrap();
        assert_eq!(
            open("regtest"),
            "Error: wallet file holds neither wallet bytes nor base64 text of wallet bytes"
        );

        std::fs::write(&path, V39_TESTNET_WALLET).unwrap();
        assert_eq!(
            open("regtest"),
            "Error: wallet file belongs to chain test, this build expected regtest"
        );
        let info = recovery(&dir_str, "regtest");
        assert_eq!(info["seed_phrase"], SEED_A);
        assert_eq!(info["birthday"], 1);
        assert_eq!(info["chain_name"], "test");
        assert_eq!(info["format_version"], 39);
        assert!(info["ufvk"].is_null());

        std::fs::write(&path, &V39_TESTNET_WALLET[..60]).unwrap();
        assert_eq!(
            open("test"),
            "Error: wallet file ends early while reading the wallet data"
        );
        let info = recovery(&dir_str, "test");
        assert_eq!(info["seed_phrase"], SEED_A);
        assert_eq!(info["birthday"], 1);

        std::fs::write(&path, &V39_TESTNET_WALLET[..20]).unwrap();
        assert_eq!(
            open("test"),
            "Error: wallet file ends early while reading the seed"
        );
        assert_eq!(
            recovery(&dir_str, "test"),
            "Error: wallet file ends early while reading the seed"
        );

        let mut newer = V39_TESTNET_WALLET.to_vec();
        newer[..8].copy_from_slice(&77u64.to_le_bytes());
        std::fs::write(&path, &newer).unwrap();
        assert_eq!(
            open("test"),
            "Error: wallet file version 77 is not supported, this build reads versions 1 to 40"
        );
    }

    #[test]
    fn recovery_info_reads_the_ios_shape_and_a_bad_chain_hint_is_an_error() {
        let _guard = global_client_test_lock();
        let dir = temp_wallet_dir("recover-ios");
        let dir_str = dir_string(&dir);
        std::fs::write(
            dir.path().join(IOS_WALLET_FILE_NAME),
            STANDARD.encode(V39_TESTNET_WALLET),
        )
        .unwrap();

        let info = recovery(&dir_str, "test");
        assert_eq!(info["seed_phrase"], SEED_A);
        assert_eq!(info["birthday"], 1);
        assert!(dir.path().join(WALLET_FILE_NAME).exists());
        assert_eq!(recovery(&dir_str, "moon"), "Error: Not a valid chain hint!");
    }

    #[test]
    fn errors_never_carry_the_wallet_payload() {
        let _guard = global_client_test_lock();
        let dir = temp_wallet_dir("payload");
        let secret = STANDARD.encode(b"seed entropy lives here and must not be echoed");
        std::fs::write(dir.path().join(WALLET_FILE_NAME), secret.as_bytes()).unwrap();

        let out = init_from_file(
            dir_string(&dir),
            String::new(),
            "regtest".to_string(),
            "Medium".to_string(),
            1,
        )
        .unwrap();
        assert!(out.starts_with("Error:"), "{out}");
        assert!(!out.contains(&secret));
        assert!(!out.contains("seed entropy"));
    }
}
