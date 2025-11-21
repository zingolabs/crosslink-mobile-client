use std::{
    any::Any,
    backtrace::Backtrace,
    collections::VecDeque,
    panic::{self, PanicHookInfo},
    sync::{Mutex, Once},
};

use once_cell::sync::Lazy;

const MAX_PANIC_HISTORY: usize = 16;

pub trait FromPanic {
    fn from_panic(msg: String) -> Self;
}

pub fn with_panic_guard<T, E, F>(f: F) -> Result<T, E>
where
    F: FnOnce() -> Result<T, E> + std::panic::UnwindSafe,
    E: FromPanic,
{
    install_panic_hook_once();
    match panic::catch_unwind(f) {
        Ok(res) => res,
        Err(payload) => Err(E::from_panic(format_panic_text(payload))),
    }
}

#[uniffi::export]
pub fn last_panic_message() -> String {
    last_panic().map(|p| p.msg).unwrap_or_default()
}

#[derive(Clone, Default)]
pub struct PanicReport {
    pub msg: String,
    pub file: Option<String>,
    pub line: Option<u32>,
    pub col: Option<u32>,
    pub backtrace: Option<String>,
}

pub(crate) static LAST_PANICS: Lazy<Mutex<VecDeque<PanicReport>>> =
    Lazy::new(|| Mutex::new(VecDeque::with_capacity(MAX_PANIC_HISTORY)));

pub(crate) fn push_panic(report: PanicReport) {
    if let Ok(mut q) = LAST_PANICS.lock() {
        if q.len() == MAX_PANIC_HISTORY {
            q.pop_front();
        }
        q.push_back(report);
    }
}

pub(crate) fn last_panic() -> Option<PanicReport> {
    LAST_PANICS.lock().ok().and_then(|q| q.back().cloned())
}

pub(crate) fn recent_panics(limit: usize) -> Vec<PanicReport> {
    LAST_PANICS
        .lock()
        .map(|q| q.iter().rev().take(limit).cloned().collect())
        .unwrap_or_default()
}

#[uniffi::export]
pub fn recent_panic_messages(limit: u32) -> Vec<String> {
    recent_panics(limit as usize)
        .into_iter()
        .map(|r| r.msg)
        .collect()
}

static PANIC_HOOK_ONCE: Once = Once::new();

pub(crate) fn install_panic_hook_once() {
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

            push_panic(PanicReport {
                msg: payload,
                file,
                line,
                col,
                backtrace: Some(bt),
            });
        }));
    });
}

pub(crate) fn clean_backtrace(bt_raw: &str) -> String {
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

pub(crate) fn format_panic_text(payload: Box<dyn Any + Send>) -> String {
    let fallback = if let Some(s) = payload.downcast_ref::<&str>() {
        (*s).to_string()
    } else if let Some(s) = payload.downcast_ref::<String>() {
        s.clone()
    } else {
        "unknown panic payload".to_string()
    };

    let rpt = last_panic().unwrap_or_else(|| PanicReport {
        msg: fallback.clone(),
        file: None,
        line: None,
        col: None,
        backtrace: None,
    });

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
