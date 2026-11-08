//! Wall time and peak resident memory of the two wallet load paths, per payload size.
//!
//! Old path (what the Android and iOS modules did): file bytes -> base64 `String` ->
//! copy across the FFI -> decode -> parse. New path: file -> parse.
//!
//! Every measurement runs in a fresh child process so the peak resident set size belongs
//! to that one step sequence. Parsing runs on a real offline wallet; the payload is the
//! wallet bytes followed by zero padding up to the requested size, which the reader
//! tolerates because it consumes only what the format describes. Padding therefore
//! exercises the I/O layers at scale while the parse step itself stays the size of the
//! fixture. The parse column is reported separately for that reason.
//!
//! Run with:
//!
//! ```text
//! cargo test --release --test wallet_io_bench -- --ignored --nocapture
//! ```
//!
//! `ZINGO_BENCH_SIZES_MB=1,5` narrows the sizes, `ZINGO_BENCH_OUT=path.md` also writes
//! the table to a file.

use std::fmt::Write as _;
use std::num::NonZeroU32;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{Duration, Instant};

use base64::Engine as _;
use base64::engine::general_purpose::STANDARD;
use bip0039::Mnemonic;
use zingolib::config::{ChainType, ZingoConfig, chain_from_str};
use zingolib::wallet::{LightWallet, SeedDerivation, WalletBase};

const CHILD_ENV: &str = "ZINGO_BENCH_CHILD";
const SIZES_MB: &[usize] = &[1, 5, 10, 25, 50, 100, 200, 400, 800];
const MB: usize = 1024 * 1024;
const SEED: &str =
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

fn chain() -> ChainType {
    chain_from_str("regtest").expect("regtest")
}

fn fixture_bytes() -> Vec<u8> {
    let config = ZingoConfig::build(chain()).create();
    let mut wallet = LightWallet::new(
        config.chain,
        WalletBase::Mnemonic {
            mnemonic: Mnemonic::from_phrase(SEED).expect("seed"),
            no_of_accounts: NonZeroU32::new(1).expect("one"),
            seed_derivation: SeedDerivation::Zip32Standard,
        },
        1.into(),
        config.wallet_settings.clone(),
    )
    .expect("wallet");
    let mut bytes = Vec::new();
    wallet.write(&mut bytes, &config.chain).expect("write");
    bytes
}

fn padded_fixture(fixture: &[u8], total: usize) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(total.max(fixture.len()));
    bytes.extend_from_slice(fixture);
    bytes.resize(total.max(fixture.len()), 0);
    bytes
}

mod rss {
    #[cfg(target_os = "macos")]
    #[allow(deprecated)]
    pub fn current_and_peak() -> (u64, u64) {
        use libc::{
            MACH_TASK_BASIC_INFO, MACH_TASK_BASIC_INFO_COUNT, mach_task_basic_info, mach_task_self,
            task_info, task_info_t,
        };
        let mut info = std::mem::MaybeUninit::<mach_task_basic_info>::uninit();
        let mut count = MACH_TASK_BASIC_INFO_COUNT;
        let status = unsafe {
            task_info(
                mach_task_self(),
                MACH_TASK_BASIC_INFO,
                info.as_mut_ptr().cast::<i32>() as task_info_t,
                &mut count,
            )
        };
        assert_eq!(status, libc::KERN_SUCCESS, "task_info failed");
        let info = unsafe { info.assume_init() };
        (info.resident_size, info.resident_size_max)
    }

    #[cfg(target_os = "linux")]
    pub fn current_and_peak() -> (u64, u64) {
        let status = std::fs::read_to_string("/proc/self/status").expect("/proc/self/status");
        let field = |name: &str| -> u64 {
            status
                .lines()
                .find_map(|line| line.strip_prefix(name))
                .and_then(|rest| {
                    rest.trim()
                        .trim_end_matches("kB")
                        .trim()
                        .parse::<u64>()
                        .ok()
                })
                .map_or(0, |kb| kb * 1024)
        };
        (field("VmRSS:"), field("VmHWM:"))
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    pub fn current_and_peak() -> (u64, u64) {
        (0, 0)
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct Step {
    name: String,
    micros: u128,
    rss_after: u64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct Report {
    path: String,
    size: usize,
    steps: Vec<Step>,
    rss_baseline: u64,
    rss_peak: u64,
}

struct Recorder {
    steps: Vec<Step>,
}

impl Recorder {
    fn time<T>(&mut self, name: &str, work: impl FnOnce() -> T) -> T {
        let start = Instant::now();
        let out = work();
        let micros = start.elapsed().as_micros();
        let (rss_after, _) = rss::current_and_peak();
        self.steps.push(Step {
            name: name.to_string(),
            micros,
            rss_after,
        });
        out
    }
}

fn old_path(file: &Path, recorder: &mut Recorder) {
    let file_bytes = recorder.time("read_file", || std::fs::read(file).expect("read"));
    let text = recorder.time("encode_base64", || STANDARD.encode(&file_bytes));
    drop(file_bytes);
    let ffi_copy = recorder.time("ffi_copy", || text.clone());
    drop(text);
    let decoded = recorder.time("decode_base64", || {
        STANDARD.decode(ffi_copy.as_bytes()).expect("decode")
    });
    drop(ffi_copy);
    let wallet = recorder.time("parse", || {
        LightWallet::read(&decoded[..], chain()).expect("parse")
    });
    drop(decoded);
    std::hint::black_box(wallet);
}

fn new_path(file: &Path, recorder: &mut Recorder) {
    let (wallet, shape) = recorder.time("read_and_parse", || {
        LightWallet::read_from_path(file, chain()).expect("read_from_path")
    });
    assert_eq!(shape, zingolib::wallet::disk::WalletFileShape::Raw);
    std::hint::black_box(wallet);
}

fn run_child(spec: &str) {
    let mut parts = spec.splitn(3, ':');
    let path = parts.next().expect("path").to_string();
    let size: usize = parts.next().expect("size").parse().expect("size");
    let file = PathBuf::from(parts.next().expect("file"));

    let (rss_baseline, _) = rss::current_and_peak();
    let mut recorder = Recorder { steps: Vec::new() };
    match path.as_str() {
        "old" => old_path(&file, &mut recorder),
        "new" => new_path(&file, &mut recorder),
        other => panic!("unknown path {other}"),
    }
    let (_, rss_peak) = rss::current_and_peak();
    let report = Report {
        path,
        size,
        steps: recorder.steps,
        rss_baseline,
        rss_peak,
    };
    println!("BENCH {}", serde_json::to_string(&report).expect("json"));
}

fn spawn_child(path: &str, size: usize, file: &Path) -> Report {
    let exe = std::env::current_exe().expect("current exe");
    let output = Command::new(exe)
        .args([
            "--ignored",
            "--exact",
            "wallet_io_bench_child",
            "--nocapture",
        ])
        .env(CHILD_ENV, format!("{path}:{size}:{}", file.display()))
        .output()
        .expect("spawn child");
    let stdout = String::from_utf8_lossy(&output.stdout);
    let line = stdout
        .lines()
        .find_map(|line| line.strip_prefix("BENCH "))
        .unwrap_or_else(|| {
            panic!(
                "child produced no report\nstdout:\n{stdout}\nstderr:\n{}",
                String::from_utf8_lossy(&output.stderr)
            )
        });
    serde_json::from_str(line).expect("report json")
}

fn mib(bytes: u64) -> f64 {
    bytes as f64 / MB as f64
}

fn ms(micros: u128) -> f64 {
    micros as f64 / 1000.0
}

fn total(report: &Report) -> Duration {
    Duration::from_micros(report.steps.iter().map(|s| s.micros).sum::<u128>() as u64)
}

fn step_ms(report: &Report, name: &str) -> String {
    report
        .steps
        .iter()
        .find(|s| s.name == name)
        .map_or("-".to_string(), |s| format!("{:.1}", ms(s.micros)))
}

fn step_rss_delta(report: &Report, name: &str) -> String {
    let mut previous = report.rss_baseline;
    for step in &report.steps {
        if step.name == name {
            let delta = step.rss_after as i128 - previous as i128;
            return format!("{:+.0}", delta as f64 / MB as f64);
        }
        previous = step.rss_after;
    }
    "-".to_string()
}

fn render(reports: &[(usize, Report, Report)], fixture_len: usize) -> String {
    let mut out = String::new();
    let _ = writeln!(
        out,
        "Fixture: {} bytes of real wallet, zero padded to each size.",
        fixture_len
    );
    let _ = writeln!(out);
    let _ = writeln!(
        out,
        "| payload | old total ms | new total ms | speedup | old peak RSS MiB | new peak RSS MiB | memory ratio |"
    );
    let _ = writeln!(out, "|---:|---:|---:|---:|---:|---:|---:|");
    for (size, old, new) in reports {
        let old_ms = total(old).as_secs_f64() * 1000.0;
        let new_ms = total(new).as_secs_f64() * 1000.0;
        let old_peak = mib(old.rss_peak - old.rss_baseline.min(old.rss_peak));
        let new_peak = mib(new.rss_peak - new.rss_baseline.min(new.rss_peak));
        let _ = writeln!(
            out,
            "| {} MB | {:.1} | {:.1} | {:.1}x | {:.0} | {:.0} | {:.1}x |",
            size / MB,
            old_ms,
            new_ms,
            if new_ms > 0.0 { old_ms / new_ms } else { 0.0 },
            old_peak,
            new_peak,
            if new_peak > 0.0 {
                old_peak / new_peak
            } else {
                0.0
            },
        );
    }
    let _ = writeln!(out);
    let _ = writeln!(
        out,
        "Old path, per step. Time in ms, memory as the change in resident set after the step, in MiB."
    );
    let _ = writeln!(out);
    let _ = writeln!(
        out,
        "| payload | read ms | read ΔRSS | encode ms | encode ΔRSS | ffi copy ms | ffi copy ΔRSS | decode ms | decode ΔRSS | parse ms | parse ΔRSS |"
    );
    let _ = writeln!(
        out,
        "|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|"
    );
    for (size, old, _) in reports {
        let _ = writeln!(
            out,
            "| {} MB | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} |",
            size / MB,
            step_ms(old, "read_file"),
            step_rss_delta(old, "read_file"),
            step_ms(old, "encode_base64"),
            step_rss_delta(old, "encode_base64"),
            step_ms(old, "ffi_copy"),
            step_rss_delta(old, "ffi_copy"),
            step_ms(old, "decode_base64"),
            step_rss_delta(old, "decode_base64"),
            step_ms(old, "parse"),
            step_rss_delta(old, "parse"),
        );
    }
    let _ = writeln!(out);
    let _ = writeln!(
        out,
        "New path, one step: `read_from_path` reads the file and parses it."
    );
    let _ = writeln!(out);
    let _ = writeln!(out, "| payload | read and parse ms | ΔRSS MiB |");
    let _ = writeln!(out, "|---:|---:|---:|");
    for (size, _, new) in reports {
        let _ = writeln!(
            out,
            "| {} MB | {} | {} |",
            size / MB,
            step_ms(new, "read_and_parse"),
            step_rss_delta(new, "read_and_parse"),
        );
    }
    out
}

#[test]
#[ignore = "benchmark: run with --ignored --nocapture"]
fn wallet_io_bench_child() {
    if let Ok(spec) = std::env::var(CHILD_ENV) {
        run_child(&spec);
    }
}

#[test]
#[ignore = "benchmark: run with --ignored --nocapture"]
fn wallet_io_bench() {
    if std::env::var(CHILD_ENV).is_ok() {
        return;
    }
    let sizes: Vec<usize> = std::env::var("ZINGO_BENCH_SIZES_MB")
        .ok()
        .map(|list| {
            list.split(',')
                .filter_map(|s| s.trim().parse::<usize>().ok())
                .collect()
        })
        .unwrap_or_else(|| SIZES_MB.to_vec());

    let fixture = fixture_bytes();
    LightWallet::read(&padded_fixture(&fixture, 4 * MB)[..], chain())
        .expect("the reader must tolerate trailing padding");

    let dir = tempfile::TempDir::new().expect("temp dir");
    let mut reports = Vec::new();
    for size_mb in sizes {
        let size = size_mb * MB;
        let file = dir.path().join(format!("wallet-{size_mb}mb.dat"));
        std::fs::write(&file, padded_fixture(&fixture, size)).expect("write payload");
        let old = spawn_child("old", size, &file);
        let new = spawn_child("new", size, &file);
        eprintln!(
            "{size_mb} MB: old {:.1} ms / peak {:.0} MiB, new {:.1} ms / peak {:.0} MiB",
            total(&old).as_secs_f64() * 1000.0,
            mib(old.rss_peak),
            total(&new).as_secs_f64() * 1000.0,
            mib(new.rss_peak),
        );
        reports.push((size, old, new));
        std::fs::remove_file(&file).expect("remove payload");
    }

    let table = render(&reports, fixture.len());
    println!("{table}");
    if let Ok(out) = std::env::var("ZINGO_BENCH_OUT") {
        std::fs::write(&out, &table).expect("write table");
        eprintln!("table written to {out}");
    }
}
