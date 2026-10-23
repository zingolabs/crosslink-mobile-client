#!/usr/bin/env node
// Build Android jniLibs natively on the host (no Docker), using cargo-ndk.
// Faster iteration than the Docker flow in rust/build_local.sh.
// Requires the NDK + cargo-ndk locally.
//
// Output:
//   <repo>/android/app/src/main/jniLibs/<abi>/libzingo.so
//   <repo>/android/app/build/generated/source/uniffi/<variant>/java/uniffi/zingo/zingo.kt
//
// Usage:
//   node build_android_local.mjs            # arm64 only: the minimal build
//   node build_android_local.mjs all        # all 4 ABIs
//   node build_android_local.mjs x86_64     # one ABI
//
// Valid ABI aliases: arm64 | armv7 | x86 | x86_64
// Cross-platform: Linux, macOS, Windows.

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ANDROID_DIR = dirname(fileURLToPath(import.meta.url));
const RUST_DIR = resolve(ANDROID_DIR, '..');
const REPO_DIR = resolve(RUST_DIR, '..');
const LIB_DIR = join(RUST_DIR, 'lib');
const TARGET_DIR = join(RUST_DIR, 'target');
const JNI_PATH = join(REPO_DIR, 'android', 'app', 'src', 'main', 'jniLibs');
const UNIFFI_PATH = join(REPO_DIR, 'android', 'app', 'build', 'generated', 'source', 'uniffi');
const KOTLIN_VARIANTS = ['debug', 'release'];
const NDK_VERSION = '28.2.13676358';
const CARGO_NDK_VERSION = '4.0.1';
const SO_NAME = 'libzingo.so';

// CARGO_FEATURE_STD mirrors .github/workflows/android-build.yaml.
const ABI_TABLE = {
  arm64: { triple: 'aarch64-linux-android', jniDir: 'arm64-v8a', featureStd: true },
  armv7: { triple: 'armv7-linux-androideabi', jniDir: 'armeabi-v7a', featureStd: false },
  x86: { triple: 'i686-linux-android', jniDir: 'x86', featureStd: false },
  x86_64: { triple: 'x86_64-linux-android', jniDir: 'x86_64', featureStd: false },
};
const ALL_ABIS = Object.keys(ABI_TABLE);

// --- Args ---
const args = process.argv.slice(2);
let abis;
if (args.length === 0) {
  abis = ['arm64'];
} else if (args.length === 1 && args[0] === 'all') {
  abis = ALL_ABIS;
} else if (args.length === 1 && ALL_ABIS.includes(args[0])) {
  abis = [args[0]];
} else {
  console.error(`ERROR: invalid args. Usage: build_android_local.mjs [all|${ALL_ABIS.join('|')}]`);
  process.exit(1);
}

// --- Helpers ---
function run(cmd, cmdArgs, opts = {}) {
  console.log(`$ ${cmd} ${cmdArgs.join(' ')}`);
  const r = spawnSync(cmd, cmdArgs, { stdio: 'inherit', ...opts });
  if (r.status !== 0) {
    console.error(`ERROR: ${cmd} failed (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}

function capture(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

// --- Host OS -> NDK toolchain dir candidates, and the default SDK location ---
const NDK_HOST_DIRS = {
  darwin: ['darwin-x86_64', 'darwin-aarch64'],
  linux: ['linux-x86_64'],
  win32: ['windows-x86_64'],
}[process.platform];
const DEFAULT_SDK = {
  darwin: join(homedir(), 'Library', 'Android', 'sdk'),
  linux: join(homedir(), 'Android', 'Sdk'),
  win32: join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk'),
}[process.platform];

if (!NDK_HOST_DIRS) {
  console.error(`ERROR: unsupported platform: ${process.platform}`);
  process.exit(1);
}

// --- Prerequisite checks ---
const missing = [];

let ANDROID_HOME = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
if (!ANDROID_HOME && DEFAULT_SDK && existsSync(DEFAULT_SDK)) {
  ANDROID_HOME = DEFAULT_SDK;
  console.log(`ANDROID_HOME not set, using ${ANDROID_HOME}`);
}
if (!ANDROID_HOME) {
  missing.push('ANDROID_HOME env var: set to your Android SDK path');
}

let NDK_PATH = null;
let NDK_TOOLCHAIN = null;
if (ANDROID_HOME) {
  NDK_PATH = join(ANDROID_HOME, 'ndk', NDK_VERSION);
  if (!existsSync(NDK_PATH)) {
    missing.push(`NDK ${NDK_VERSION}: install via Android Studio SDK Manager (SDK Tools -> NDK Side-by-side)`);
  } else {
    for (const hostDir of NDK_HOST_DIRS) {
      const candidate = join(NDK_PATH, 'toolchains', 'llvm', 'prebuilt', hostDir, 'bin');
      if (existsSync(candidate)) {
        NDK_TOOLCHAIN = candidate;
        break;
      }
    }
    if (!NDK_TOOLCHAIN) {
      missing.push(`NDK toolchain bin not found under ${NDK_PATH}/toolchains/llvm/prebuilt/`);
    }
  }
}

if (!capture('cargo', ['--version'])) {
  missing.push('cargo: install Rust toolchain from https://rustup.rs');
}
if (!capture('cargo', ['ndk', '--version'])) {
  missing.push(`cargo-ndk ${CARGO_NDK_VERSION}: cargo install --version ${CARGO_NDK_VERSION} cargo-ndk`);
}
if (!capture('bindgen', ['--version'])) {
  missing.push('bindgen-cli: cargo install --force --locked bindgen-cli');
}
if (!capture('protoc', ['--version'])) {
  missing.push('protoc: apt install protobuf-compiler (Linux), brew install protobuf (macOS), winget install Google.Protobuf (Windows)');
}

const installedTargets = (capture('rustup', ['target', 'list', '--installed']) ?? '').split('\n');
for (const abi of abis) {
  const t = ABI_TABLE[abi].triple;
  if (!installedTargets.includes(t)) {
    missing.push(`Rust target ${t}: rustup target add ${t}`);
  }
}

if (missing.length > 0) {
  console.error('ERROR: missing prerequisites:');
  for (const m of missing) console.error(`  - ${m}`);
  process.exit(1);
}

// --- Environment (host-safe; cargo-ndk wires per-target CC/AR/LINKER) ---
//
// Do NOT prepend NDK_TOOLCHAIN to PATH nor export global CC/AR/LD/RANLIB.
// That makes build.rs HOST compiles (ring, aws-lc-sys, ...) pick up the NDK
// clang, which on macOS lacks the macOS SDK headers.
const env = {
  ...process.env,
  ANDROID_NDK_ROOT: NDK_PATH,
  ANDROID_NDK_HOME: NDK_PATH,
  ANDROID_NDK: NDK_PATH,
  LIBCLANG_PATH: process.env.LIBCLANG_PATH ?? join(NDK_TOOLCHAIN, '..', 'lib'),
  CARGO_NDK_PLATFORM: '26',
  CARGO_NDK_ANDROID_PLATFORM: '26',
  // Target-suffixed flags only fire when cc-rs builds for aarch64-linux-android.
  CFLAGS_aarch64_linux_android: '-mno-outline-atomics',
  CXXFLAGS_aarch64_linux_android: '-mno-outline-atomics',
};

process.chdir(LIB_DIR);

// --- Build per ABI ---
const exe = process.platform === 'win32' ? '.exe' : '';
let bindingsSource = null;
for (const abi of abis) {
  const { triple, jniDir, featureStd } = ABI_TABLE[abi];
  console.log(`\n=== Building ${abi} (${triple}) ===`);

  const abiEnv = { ...env, CARGO_FEATURE_STD: featureStd ? 'true' : 'false' };

  run('cargo', ['ndk', '--target', triple, 'build', '--release'], { env: abiEnv });

  const soPath = join(TARGET_DIR, triple, 'release', SO_NAME);

  // Kotlin bindings come from the UniFFI metadata in the unstripped .so, so
  // keep one copy before stripping.
  if (bindingsSource === null) {
    bindingsSource = join(TARGET_DIR, triple, 'release', 'libzingo.unstripped.so');
    copyFileSync(soPath, bindingsSource);
  }

  run(join(NDK_TOOLCHAIN, `llvm-strip${exe}`), ['--strip-all', soPath], { env: abiEnv });
  run(join(NDK_TOOLCHAIN, `llvm-objcopy${exe}`), ['--remove-section', '.comment', soPath], { env: abiEnv });

  console.log(`sha256  ${sha256File(soPath)}  ${soPath}`);

  const dstDir = join(JNI_PATH, jniDir);
  mkdirSync(dstDir, { recursive: true });
  copyFileSync(soPath, join(dstDir, SO_NAME));
}

// --- Kotlin bindings, into the source dir android/app/build.gradle compiles ---
console.log('\n=== Generating Kotlin bindings ===');
const firstVariant = join(UNIFFI_PATH, KOTLIN_VARIANTS[0], 'java');
rmSync(firstVariant, { recursive: true, force: true });
mkdirSync(firstVariant, { recursive: true });
run(
  'cargo',
  [
    'run', '--release', '--features=uniffi/cli', '--bin', 'uniffi-bindgen', '--',
    'generate', '--library', bindingsSource, '--language', 'kotlin', '--out-dir', firstVariant,
  ],
  { env },
);
const kt = join('uniffi', 'zingo', 'zingo.kt');
for (const variant of KOTLIN_VARIANTS.slice(1)) {
  const dst = join(UNIFFI_PATH, variant, 'java', kt);
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(join(firstVariant, kt), dst);
}

console.log(`\nDone. ABIs built: ${abis.join(', ')}`);
