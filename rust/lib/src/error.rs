use crate::panic_handler::FromPanic;

#[derive(uniffi::Error, Debug, thiserror::Error)]
pub enum ZingolibError {
    #[error("Error: Lightclient is not initialized")]
    LightclientNotInitialized,

    #[error("Error: Lightclient lock poisoned")]
    LightclientLockPoisoned,

    #[error("panic: {0}")]
    Panic(String),
}

impl FromPanic for ZingolibError {
    fn from_panic(msg: String) -> Self {
        ZingolibError::Panic(msg)
    }
}

#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum InitError {
    #[error("invalid input: {0}")]
    InvalidInput(String),

    #[error("base64 decode failed")]
    Base64Decode,

    #[error("config error")]
    Config(#[from] ConfigError),

    #[error("wallet read failed")]
    WalletRead,

    #[error("lightwalletd query failed")]
    Network,

    #[error("anchor height underflow (tip {tip}, offset {offset})")]
    HeightUnderflow { tip: u32, offset: u32 },

    #[error("lightclient creation failed")]
    LightClient,

    #[error("wallet creation failed")]
    WalletNew,

    #[error("seed error")]
    Seed(#[from] SeedError),

    #[error("ufvk error")]
    Ufvk(#[from] UfvkError),

    #[error("mnemonic parsing failed")]
    Mnemonic,

    #[error("{0}")]
    Panic(String),
}

impl FromPanic for InitError {
    fn from_panic(msg: String) -> Self {
        InitError::Panic(msg)
    }
}

#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum ConfigError {
    #[error("invalid chain hint: {0}")]
    InvalidChainHint(String),

    #[error("invalid performance level: {0}")]
    InvalidPerformanceLevel(String),

    #[error("invalid min_confirmations: {0}")]
    InvalidMinConfirmations(String),

    #[error("loading client config failed")]
    Load,

    #[error("panic")]
    Panic,
}

impl FromPanic for ConfigError {
    fn from_panic(_msg: String) -> Self {
        ConfigError::Panic
    }
}

#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum SeedError {
    #[error("lightclient not initialized")]
    NotInitialized,

    #[error("failed to lock lightclient")]
    LockPoisoned,

    #[error("no mnemonic found (wallet loaded from key)")]
    NoMnemonic,

    #[error("failed to serialize recovery info")]
    Serialize,

    #[error("panic")]
    Panic,
}

impl FromPanic for SeedError {
    fn from_panic(_msg: String) -> Self {
        SeedError::Panic
    }
}

#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum UfvkError {
    #[error("lightclient not initialized")]
    NotInitialized,

    #[error("failed to lock lightclient")]
    LockPoisoned,

    #[error("account 0 not found")]
    NoAccount0,

    #[error("account 0 could not be converted to UnifiedFullViewingKey")]
    NotUfvk,

    #[error("panic")]
    Panic,
}

impl FromPanic for UfvkError {
    fn from_panic(_msg: String) -> Self {
        UfvkError::Panic
    }
}
