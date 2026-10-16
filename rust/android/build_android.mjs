#!/usr/bin/env node
// Build all 4 Android ABIs in a Docker container (reproducible), the same
// flow as rust/build.sh, driven from one place.
// Output: <repo>/android/app/src/main/jniLibs/<abi>/libzingo.so + Kotlin bindings.
// Cross-platform: Linux, macOS, Windows (requires Docker Desktop running).

import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ANDROID_DIR = dirname(fileURLToPath(import.meta.url));
const RUST_DIR = resolve(ANDROID_DIR, '..');
const REPO_DIR = resolve(RUST_DIR, '..');
const IMAGE_TAG = 'localhost/devlocal/build_android';
const JNI_PATH = join(REPO_DIR, 'android', 'app', 'src', 'main', 'jniLibs');
const UNIFFI_PATH = join(REPO_DIR, 'android', 'app', 'build', 'generated', 'source', 'uniffi');
const SO_NAME = 'libzingo.so';

const ABIS = [
  { triple: 'x86_64-linux-android', jniDir: 'x86_64' },
  { triple: 'i686-linux-android', jniDir: 'x86' },
  { triple: 'armv7-linux-androideabi', jniDir: 'armeabi-v7a' },
  { triple: 'aarch64-linux-android', jniDir: 'arm64-v8a' },
];

function run(cmd, args) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`ERROR: ${cmd} failed (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}

function capture(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

if (!capture('docker', ['--version'])) {
  console.error('ERROR: docker not found. Install Docker Desktop and ensure the daemon is running.');
  process.exit(1);
}

process.chdir(RUST_DIR);

console.log('=== Building Docker image ===');
run('docker', ['build', '--target', 'build_android', '--tag', IMAGE_TAG, '.', '-f', 'Dockerfile']);

console.log('\n=== Creating temporary container ===');
const containerId = capture('docker', ['create', IMAGE_TAG]);
if (!containerId) {
  console.error('ERROR: docker create failed');
  process.exit(1);
}

try {
  console.log('\n=== Extracting .so artifacts ===');
  for (const { triple, jniDir } of ABIS) {
    mkdirSync(join(JNI_PATH, jniDir), { recursive: true });
    run('docker', [
      'cp',
      `${containerId}:/opt/zingo/rust/target/${triple}/release/${SO_NAME}`,
      join(JNI_PATH, jniDir, SO_NAME),
    ]);
  }

  console.log('\n=== Extracting Kotlin bindings ===');
  for (const variant of ['debug', 'release']) {
    const dir = join(UNIFFI_PATH, variant, 'java', 'uniffi', 'zingo');
    mkdirSync(dir, { recursive: true });
    run('docker', [
      'cp',
      `${containerId}:/opt/zingo/rust/lib/src/uniffi/zingo/zingo.kt`,
      join(dir, 'zingo.kt'),
    ]);
  }
} finally {
  console.log('\n=== Cleaning up container ===');
  spawnSync('docker', ['rm', '-v', containerId], { stdio: 'inherit' });
}

console.log('\nDone. 4 ABIs built and exported.');
