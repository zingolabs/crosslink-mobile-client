#!/usr/bin/env node
// Build the iOS Zingolib XCFramework: the device slice (arm64) and the
// simulator slice (arm64 + x86_64 fat). Xcode picks the right slice per build
// destination, so there is no separate "for device" vs "for simulator" build.
//
// Output:
//   <repo>/ios/Zingolib.xcframework/  (the bundle Xcode links against)
//   <repo>/ios/zingo.swift            (Swift bindings, compiled with the app)
//
// Usage:
//   node rust/ios/build_ios.mjs            # device + simulator (default)
//   node rust/ios/build_ios.mjs sim        # simulator slices only, faster
//
// macOS only.

import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'darwin') {
  console.error('ERROR: iOS builds require macOS with Xcode installed.');
  process.exit(1);
}

const IOS_DIR = dirname(fileURLToPath(import.meta.url));
const RUST_DIR = resolve(IOS_DIR, '..');
const LIB_DIR = join(RUST_DIR, 'lib');
const TARGET_DIR = join(RUST_DIR, 'target');
const REPO_IOS_DIR = resolve(RUST_DIR, '..', 'ios');

const DEVICE_TARGET = 'aarch64-apple-ios';
const SIM_TARGETS = ['aarch64-apple-ios-sim', 'x86_64-apple-ios'];

const SIM_FAT_DIR = join(TARGET_DIR, 'universal-sim', 'release');
const SIM_FAT_LIB = join(SIM_FAT_DIR, 'libzingo.a');
const DEVICE_LIB = join(TARGET_DIR, DEVICE_TARGET, 'release', 'libzingo.a');
const XCF_HEADERS_DIR = join(TARGET_DIR, 'xcframework-headers');
const XCFRAMEWORK_OUT = join(REPO_IOS_DIR, 'Zingolib.xcframework');
const GENERATED = join(LIB_DIR, 'Generated');

// --- Args ---
const args = process.argv.slice(2);
const simOnly = args.length === 1 && args[0] === 'sim';
if (args.length > 0 && !simOnly) {
  console.error('ERROR: invalid args. Usage: build_ios.mjs [sim]');
  process.exit(1);
}
const targets = simOnly ? SIM_TARGETS : [DEVICE_TARGET, ...SIM_TARGETS];

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

// --- Prerequisites ---
const missing = [];
if (!capture('cargo', ['--version'])) {
  missing.push('cargo: install Rust from https://rustup.rs');
}
// librocksdb-sys and aws-lc-sys run bindgen at build time.
if (!capture('bindgen', ['--version'])) {
  missing.push('bindgen-cli: cargo install --force --locked bindgen-cli');
}
if (!capture('protoc', ['--version'])) {
  missing.push('protoc: brew install protobuf');
}
const installedTargets = (
  capture('rustup', ['target', 'list', '--installed']) ?? ''
).split('\n');
for (const t of targets) {
  if (!installedTargets.includes(t)) {
    missing.push(`Rust target ${t}: rustup target add ${t}`);
  }
}
if (missing.length > 0) {
  console.error('ERROR: missing prerequisites:');
  for (const m of missing) console.error(`  - ${m}`);
  process.exit(1);
}

// --- Environment ---
// The simulator targets need the simulator SDK for the C parts
// (librocksdb-sys, aws-lc-sys); the device target finds its SDK on its own.
const SDK_SIM = capture('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-path']);
const CLANG_SIM = capture('xcrun', ['--sdk', 'iphonesimulator', '-f', 'clang']);
const AR_SIM = capture('xcrun', ['--sdk', 'iphonesimulator', '-f', 'ar']);
const simArm = `--target=arm64-apple-ios-simulator -isysroot ${SDK_SIM}`;
const simX86 = `--target=x86_64-apple-ios-simulator -isysroot ${SDK_SIM}`;

const env = {
  ...process.env,
  IPHONEOS_DEPLOYMENT_TARGET: '16.0',
  BINDGEN_EXTRA_CLANG_ARGS_aarch64_apple_ios_sim: simArm,
  CFLAGS_aarch64_apple_ios_sim: simArm,
  CXXFLAGS_aarch64_apple_ios_sim: simArm,
  CC_aarch64_apple_ios_sim: CLANG_SIM,
  AR_aarch64_apple_ios_sim: AR_SIM,
  BINDGEN_EXTRA_CLANG_ARGS_x86_64_apple_ios: simX86,
  CFLAGS_x86_64_apple_ios: simX86,
  CXXFLAGS_x86_64_apple_ios: simX86,
  CC_x86_64_apple_ios: CLANG_SIM,
  AR_x86_64_apple_ios: AR_SIM,
};

// 0. Legacy artifacts from the pre-xcframework flow. Idempotent: after the
//    first run on a clean checkout these files are gone for good.
for (const stale of ['libzingo.a', 'zingoFFI.h', 'zingoFFI.modulemap']) {
  rmSync(join(REPO_IOS_DIR, stale), { force: true });
}

// 1. Build cargo for each target.
process.chdir(LIB_DIR);
for (const target of targets) {
  run('cargo', ['build', '--release', '--target', target], { env });
}

// 2. Generate the uniffi Swift bindings (library mode reads the metadata from
//    the built dylib, so this runs after the first build).
const bindingsSource = join(TARGET_DIR, targets[0], 'release', 'libzingo.dylib');
mkdirSync(GENERATED, { recursive: true });
run(
  'cargo',
  [
    'run', '--release', '--features=uniffi/cli', '--bin', 'uniffi-bindgen', '--',
    'generate', '--library', bindingsSource, '--language', 'swift', '--out-dir', GENERATED,
  ],
  { env },
);

// 3. Lipo the 2 simulator targets into one fat .a.
mkdirSync(SIM_FAT_DIR, { recursive: true });
run('lipo', [
  '-create',
  join(TARGET_DIR, 'aarch64-apple-ios-sim', 'release', 'libzingo.a'),
  join(TARGET_DIR, 'x86_64-apple-ios', 'release', 'libzingo.a'),
  '-output', SIM_FAT_LIB,
]);

// 4. Headers dir: the FFI header plus the module map, named module.modulemap
//    so Xcode picks it up from the xcframework's Headers/.
rmSync(XCF_HEADERS_DIR, { recursive: true, force: true });
mkdirSync(XCF_HEADERS_DIR, { recursive: true });
copyFileSync(join(GENERATED, 'zingoFFI.h'), join(XCF_HEADERS_DIR, 'zingoFFI.h'));
writeFileSync(
  join(XCF_HEADERS_DIR, 'module.modulemap'),
  readFileSync(join(GENERATED, 'zingoFFI.modulemap'), 'utf8'),
);

// 5. The xcframework. A sim-only build ships one slice; Xcode then refuses
//    device builds until the full build runs, which is the point.
if (existsSync(XCFRAMEWORK_OUT)) {
  rmSync(XCFRAMEWORK_OUT, { recursive: true, force: true });
}
const slices = simOnly
  ? ['-library', SIM_FAT_LIB, '-headers', XCF_HEADERS_DIR]
  : [
      '-library', DEVICE_LIB, '-headers', XCF_HEADERS_DIR,
      '-library', SIM_FAT_LIB, '-headers', XCF_HEADERS_DIR,
    ];
run('xcodebuild', ['-create-xcframework', ...slices, '-output', XCFRAMEWORK_OUT]);

// 6. Swift bindings, compiled as a normal app source.
copyFileSync(join(GENERATED, 'zingo.swift'), join(REPO_IOS_DIR, 'zingo.swift'));

console.log(`\nDone. XCFramework at ${XCFRAMEWORK_OUT}${simOnly ? ' (simulator only)' : ''}`);
