use std::num::NonZeroU32;

#[cfg(target_os = "android")]
use android_logger::{Config, FilterBuilder};
#[cfg(target_os = "android")]
use log::Level;

use pepper_sync::config::PerformanceLevel;
use zingo_common_components::protocol::activation_heights::for_test::all_height_one_nus;
use zingolib::{
    config::{
        ChainType, SyncConfig, TransparentAddressDiscovery, ZingoConfig, construct_lightwalletd_uri,
    },
    lightclient::LightClient,
    wallet::WalletSettings,
};

use crate::{
    error::{ConfigError, ZingolibError},
    lightclient::LIGHTCLIENT,
    panic_handler::with_panic_guard,
};

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

pub(crate) fn reset_lightclient() {
    with_lightclient_write(|slot| {
        *slot = None;
    });
}

pub(crate) fn store_client(lightclient: LightClient) -> Result<(), ZingolibError> {
    with_lightclient_write(|slot| {
        *slot = Some(lightclient);
    });
    Ok(())
}

pub(crate) fn construct_uri_load_config(
    uri: String,
    chain_hint: String,
    performance_level: String,
    min_confirmations: u32,
) -> Result<(ZingoConfig, http::Uri), ConfigError> {
    // if uri is empty -> Offline Mode.
    let lightwalletd_uri = construct_lightwalletd_uri(Some(uri));

    let chaintype = match chain_hint.as_str() {
        "main" => ChainType::Mainnet,
        "test" => ChainType::Testnet,
        "regtest" => ChainType::Regtest(all_height_one_nus()),
        _ => return Err(ConfigError::InvalidChainHint(chain_hint)),
    };
    let performancetype = match performance_level.as_str() {
        "Maximum" => PerformanceLevel::Maximum,
        "High" => PerformanceLevel::High,
        "Medium" => PerformanceLevel::Medium,
        "Low" => PerformanceLevel::Low,
        _ => return Err(ConfigError::InvalidPerformanceLevel(performance_level)),
    };

    let confirmations = NonZeroU32::try_from(min_confirmations)
        .map_err(|_| ConfigError::InvalidMinConfirmations(min_confirmations.to_string()))?;

    let config = zingolib::config::load_clientconfig(
        lightwalletd_uri.clone(),
        None,
        chaintype,
        WalletSettings {
            sync_config: SyncConfig {
                transparent_address_discovery: TransparentAddressDiscovery::minimal(),
                performance_level: performancetype,
            },
            min_confirmations: confirmations,
        },
        NonZeroU32::try_from(1).expect("hard-coded integer"),
        "".to_string(),
    )
    .map_err(|_| ConfigError::Load)?;

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
