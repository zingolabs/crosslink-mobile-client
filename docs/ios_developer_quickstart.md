# iOS
## Prerequisites
1. Yarn
2. NodeJS (recommended version 22.18.0 or higher)
3. Rust (https://www.rust-lang.org/tools/install)
4. Rustup iOS targets (`rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios`)
5. bindgen-cli (`cargo install --force --locked bindgen-cli`) and protoc (`brew install protobuf`)
6. Cocoapods (`sudo gem install cocoapods`)

## Building for physical device
1. Clone the repository.
2. Go to the cloned repo `cd crosslink-mobile-client`.
3. From the root of the project, run: <br />
   `yarn`
4. Then run: <br />
   `yarn rust:ios` (alias: `yarn build:ios`) <br />
   This builds `ios/Zingolib.xcframework` (device + simulator slices) and
   `ios/zingo.swift`. It may take a long time.
5. In the `ios` directory, run: <br />
   `pod install`

## Building for simulator
1. Clone the repository.
2. Go to the cloned repo `cd crosslink-mobile-client`.
3. From the root of the project, run: <br />
   `yarn`
4. Then run: <br />
   `yarn rust:ios:sim` (alias: `yarn build:ios:sim`) <br />
   Simulator slices only, so it is faster than `yarn build:ios`.
5. In the `ios` directory, run: <br />
   `pod install`

## Launching the app
1. In a terminal, run: <br />
   `yarn start`
2. In a separate terminal, run: <br />
   `yarn ios` <br />
   You can also open the `ios` directory in XCode and run it there.
