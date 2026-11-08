# Wallet file I/O: base64 path versus path-based load

Measured on an Apple M4 Max (Mac16,5), 48 GiB RAM, macOS 26.3.1, rustc 1.98.1, release profile, on 2026-11-07.

Command:

```text
cd rust && cargo test --release --test wallet_io_bench -- --ignored --nocapture
```

The benchmark lives in `rust/lib/tests/wallet_io_bench.rs`. Every measurement runs in a fresh child process, so the peak resident set size (RSS) is the peak of that one load. The payload is a real offline wallet (regtest, one account, written by `LightWallet::write`) followed by zero padding up to the requested size. The reader consumes only what the format describes, so the padding passes through the I/O layers at full size while the parse step stays the size of the fixture. The parse column is therefore the fixed cost of parsing the fixture, and the growth across rows is the cost of moving the bytes.

Old path: file -> `Vec<u8>` -> base64 `String` -> a copy modelling the FFI buffer -> decode -> parse. Each buffer is dropped as soon as the next one exists, which is the best case for the old code. New path: `LightWallet::read_from_path`, which is file -> `Vec<u8>` -> parse.

## Measured

Fixture: 456 bytes of real wallet, zero padded to each size.

| payload | old total ms | new total ms | speedup | old peak RSS MiB | new peak RSS MiB | memory ratio |
|---:|---:|---:|---:|---:|---:|---:|
| 1 MB | 8.8 | 8.4 | 1.1x | 5 | 3 | 2.0x |
| 5 MB | 12.1 | 8.6 | 1.4x | 20 | 7 | 3.0x |
| 10 MB | 16.0 | 9.0 | 1.8x | 38 | 12 | 3.3x |
| 25 MB | 27.8 | 10.5 | 2.6x | 93 | 27 | 3.5x |
| 50 MB | 47.3 | 12.5 | 3.8x | 185 | 52 | 3.6x |
| 100 MB | 85.3 | 17.3 | 4.9x | 368 | 102 | 3.6x |
| 200 MB | 169.8 | 26.6 | 6.4x | 735 | 202 | 3.6x |
| 400 MB | 399.2 | 45.8 | 8.7x | 1468 | 402 | 3.7x |
| 800 MB | 712.8 | 80.0 | 8.9x | 2935 | 802 | 3.7x |

Old path, per step. Time in ms, memory as the change in resident set after the step, in MiB.

| payload | read ms | read ΔRSS | encode ms | encode ΔRSS | ffi copy ms | ffi copy ΔRSS | decode ms | decode ΔRSS | parse ms | parse ΔRSS |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 MB | 0.2 | +1 | 0.3 | +1 | 0.1 | +1 | 0.3 | +0 | 8.0 | +2 |
| 5 MB | 0.5 | +5 | 1.4 | +7 | 0.4 | +7 | 1.3 | +0 | 8.4 | +2 |
| 10 MB | 1.0 | +10 | 3.2 | +13 | 0.9 | +13 | 2.7 | +0 | 8.3 | +2 |
| 25 MB | 2.5 | +25 | 7.8 | +33 | 2.1 | +33 | 7.0 | +0 | 8.5 | +2 |
| 50 MB | 4.7 | +50 | 15.9 | +67 | 4.1 | +67 | 14.2 | +0 | 8.5 | +2 |
| 100 MB | 9.2 | +100 | 31.7 | +133 | 8.5 | +133 | 27.6 | +0 | 8.3 | +2 |
| 200 MB | 17.7 | +200 | 63.1 | +267 | 18.8 | +267 | 60.9 | +0 | 9.2 | +2 |
| 400 MB | 39.4 | +400 | 174.6 | +533 | 39.1 | +533 | 138.0 | +0 | 8.1 | +2 |
| 800 MB | 80.2 | +800 | 292.6 | +1067 | 71.6 | +1067 | 260.1 | +0 | 8.3 | +2 |

New path, one step: `read_from_path` reads the file and parses it.

| payload | read and parse ms | ΔRSS MiB |
|---:|---:|---:|
| 1 MB | 8.4 | +3 |
| 5 MB | 8.6 | +7 |
| 10 MB | 9.0 | +12 |
| 25 MB | 10.5 | +27 |
| 50 MB | 12.5 | +52 |
| 100 MB | 17.3 | +102 |
| 200 MB | 26.6 | +202 |
| 400 MB | 45.8 | +402 |
| 800 MB | 80.0 | +802 |

The peak of the old path equals the sum of the file bytes, the base64 text and the FFI copy: the allocator does not hand freed buffers back to the system before the next large allocation lands, so dropping a buffer early buys nothing. The same happens on a device, where the garbage collector and the native allocator both free lazily. The per-step figures are the resident growth measured right after each step, so a step that allocates as much as the previous drop released shows `+0`. The parse step is constant, at the size of the 456 byte fixture, in every row.

At 800 MB the old path holds 2.9 GB resident, which is the kind of figure the Android Java heap limits in the next section put at a few tens of MB of wallet instead.

## Android break points, old path

`RPCModule.kt` read the file into a `ByteArray`, base64 encoded it through eight 6 MB pieces into a `StringBuilder`, turned that into a `String`, and handed the `String` to uniffi. `W` is the wallet file size in bytes. Base64 text is `T = 4W/3`.

The eight pieces only bound the transient of a single `Base64.encodeToString` call for files up to 48 MB. The last piece runs from byte 42,000,000 to the end of the file, so above 48 MB one piece carries the rest of the file.

| step | allocation | type limit | reached at W | Java heap cost |
|---|---|---|---|---|
| `openFileInput().readBytes()` | `ByteArrayOutputStream` sized by `available()`, then `toByteArray()` copies | array length 2^31-1 | 2.0 GiB, with 2W transient so about 1 GiB in practice | W retained, 2W transient |
| `Base64.encodeToString(piece)` | `byte[]` of 4/3 piece, then a `String` of the same length | array length 2^31-1 | 1.5 GiB for the last piece | 8/3 piece transient (16 MB per 6 MB piece, unbounded for the last piece) |
| `StringBuilder.append` | compact `byte[]`, capacity doubles: `(old << 1) + 2` | array length 2^31-9 | T > 2^31-9, so W > 1.5 GiB | between T and 2T capacity; old plus new buffer during a grow, so up to 3T transient |
| `StringBuilder.toString()` | new `String` of T | string length 2^31-1 | W = 1.5 GiB (1,610,612,735 bytes) | T |
| uniffi `FfiConverterString.lower`: `toUtf8` | `ByteBuffer` from `CharsetEncoder.encode`, 1.1 bytes per char for ASCII | array length 2^31-1 | W = 1.46 GiB | 1.1T |
| uniffi `RustBuffer.alloc` + `put` | native `Vec<u8>` of T (not Java heap) | `u64` length in uniffi 0.31 | none from the type; 32-bit `armv7` address space at a few hundred MB | 0 (native T) |
| Rust `String` | moved out of the `RustBuffer`, no copy | `usize` | none | 0 (native T) |
| Rust `STANDARD.decode` | `Vec<u8>` of W | `usize` | none | 0 (native W) |
| `LightWallet::read` | the wallet structures | `usize` | none | 0 (native) |

Java heap at the moment uniffi copies into the `RustBuffer`, with every earlier local still reachable: `W + C + T + 1.1T`, where `C` is the final `StringBuilder` capacity, between `T` and `2T`. That is between `4.5W` and `5.8W`. Native at the same moment: `T`, then `T + W` during decode.

Java heap limits are device properties (`dalvik.vm.heapgrowthlimit` without `largeHeap`, `dalvik.vm.heapsize` with it). The app sets `android:largeHeap="true"`. The wallet file size that fills the heap on its own, with nothing else allocated:

| heap limit | typical device | breaks between (5.8W) and (4.5W) |
|---|---|---|
| 192 MB | low-end, 2 to 3 GB RAM, `heapgrowthlimit` | 33 MB and 43 MB |
| 256 MB | most phones, `heapgrowthlimit` | 44 MB and 57 MB |
| 384 MB | some flagships, `heapgrowthlimit` | 66 MB and 85 MB |
| 512 MB | `heapsize` with `largeHeap` on most phones | 88 MB and 114 MB |
| 1024 MB | `heapsize` with `largeHeap` on high-RAM phones | 177 MB and 228 MB |

The React Native process already holds tens of MB of Java objects, so the real break point sits below these figures. The hard type limits (1.5 GiB for the base64 `String`) are never reached: the heap fails first.

The old save path (`saveToB64`) was the mirror image: Rust `Vec` W -> Rust `String` T -> uniffi `lift` (`ByteArray` T, then `String` T) -> `checkB64` lowers the `String` again (`ByteBuffer` 1.1T plus native T, Rust decodes to W) -> `Base64.decode` to `ByteArray` W -> write. Java heap `T + T + 1.1T + W = 5.1W`, and the `ByteArray(value.len.toInt())` in `lift` caps T at 2^31-1.

New path on Android: Kotlin passes a path. Rust allocates `W` for the file bytes and the parsed wallet. Java heap cost is zero. The limit is the process memory the kernel allows, which is the device RAM minus the rest of the app.

## iOS break points, old path

`RPCModule.swift` stored the wallet as base64 text, so the file itself is `T = 4W/3`.

| step | allocation | type limit | reached at W | process memory cost |
|---|---|---|---|---|
| `String(contentsOfFile:encoding:.utf8)` | the file bytes read by Foundation, then an `NSString`, bridged to a native Swift `String` | `Int` (64-bit) | none from the type | up to 3T transient, T retained |
| uniffi `FfiConverterString.lower`: `utf8CString` | `ContiguousArray<CChar>` of T+1 | `Int` | none | T |
| `RustBuffer.from` | native `Vec<u8>` of T, copied from the array | `u64` | none | T |
| Rust `STANDARD.decode` | `Vec<u8>` of W | `usize` | none | W |
| `LightWallet::read` | the wallet structures | `usize` | none | wallet |

Peak during load: `T (Swift String) + T (utf8CString) + T (RustBuffer) + W = 5W`, or `4W` once the C string array is released before the decode. No 2^31 limit exists on this side, so the break point is the Jetsam memory limit for a foreground app:

| device RAM | approximate foreground limit | breaks between (5W) and (4W) |
|---|---|---|
| 2 GB | 1.4 GB | 280 MB and 350 MB |
| 3 GB | 2.1 GB | 420 MB and 525 MB |
| 4 GB | 3.0 GB | 600 MB and 750 MB |
| 6 to 8 GB | 3.5 to 4 GB | 700 MB and 1 GB |

Background refresh (`AppDelegate.swift` BGTask) loads the wallet through the same path with a far smaller budget, in the low hundreds of MB, so a 50 MB wallet costing 250 MB was already at risk there.

The old save path: Rust `Vec` W -> Rust `String` T -> uniffi `lift` (Swift `String` T) -> `checkB64` lowers it again (array T, native T, decoded W) -> `write(toFile:atomically:)` encodes to `Data` T and writes a temporary file. Peak about `4T + W = 6.3W`, plus the on-disk file is 4/3 the size of the wallet.

New path on iOS: Swift passes the Documents path. Rust allocates `W` and the parsed wallet. The file is raw bytes, so the disk footprint drops by a quarter, and the Swift side holds nothing.

## Emulator and device verification

No Android emulator image and no iOS device were available on the machine that produced this document, so the break points above are derived from the allocation sequence and the published limits. The Android instrumented test `WalletFileRoundTrip` and the XCTest `WalletFileRoundTrip` exercise the new path through the native modules on a simulator or emulator once one is attached.
