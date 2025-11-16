uniffi::setup_scaffolding!();

pub mod error;
pub mod lightclient;
pub mod panic_handler;

#[macro_use]
extern crate lazy_static;
extern crate android_logger;

#[cfg(test)]
mod tests {
    use base64::Engine;

    use crate::error::{ConfigError, InitError, SeedError, UfvkError, ZingolibError};
    use crate::panic_handler::with_panic_guard;

    use crate::{
        lightclient::check_b64,
        panic_handler::{
            LAST_PANICS, PanicReport, clean_backtrace, format_panic_text, install_panic_hook_once,
            last_panic_message, push_panic, recent_panics,
        },
    };
    use std::any::Any;

    use std::panic;

    fn drain_last_panic() {
        if let Ok(mut q) = LAST_PANICS.lock() {
            q.clear();
        }
    }

    #[test]
    fn set_and_take_last_panic_roundtrip() {
        drain_last_panic();

        let report = PanicReport {
            msg: "test message".to_string(),
            file: Some("src/lib.rs".to_string()),
            line: Some(42),
            col: Some(7),
            backtrace: Some("frame1\nframe2".to_string()),
        };

        push_panic(report.clone());

        let panics = recent_panics(2);

        let first_panic = panics.get(0).unwrap();

        // Second read returns empty
        let second_panic = panics.get(1);
        assert!(second_panic.is_none());

        // First read returns what we stored
        assert_eq!(first_panic.msg, report.msg);
        assert_eq!(first_panic.file, report.file);
        assert_eq!(first_panic.line, report.line);
        assert_eq!(first_panic.col, report.col);
        assert_eq!(first_panic.backtrace.is_some(), report.backtrace.is_some());
    }

    #[test]
    fn clean_backtrace_filters_unknown_and_blank_lines() {
        let input = "frame1\n<unknown> something\n\n frame2\n";
        let cleaned = clean_backtrace(input);

        assert_eq!(cleaned, "frame1\n frame2\n");
        assert!(!cleaned.contains("<unknown>"));
        assert!(!cleaned.contains("something"));
    }

    #[test]
    fn format_panic_text_uses_fallback_when_no_report() {
        drain_last_panic();

        let payload: Box<dyn Any + Send> = Box::new(String::from("fallback payload"));
        let text = format_panic_text(payload);

        // With no PanicReport stored, it should fall back to the payload string.
        assert!(
            text.contains("fallback payload"),
            "panic text did not contain fallback payload: {text}"
        );

        // LAST_PANIC should be empty (it was already empty).
        let msg = last_panic_message();
        assert_eq!(msg, "");
    }

    #[test]
    fn format_panic_text_prefers_report_over_payload_and_keeps_it() {
        drain_last_panic();

        let bt = "frame1\n<unknown> ignore me\nframe2\n";
        let report = PanicReport {
            msg: "stored panic message".to_string(),
            file: Some("src/lib.rs".to_string()),
            line: Some(12),
            col: Some(34),
            backtrace: Some(bt.to_string()),
        };
        push_panic(report);

        let payload: Box<dyn Any + Send> = Box::new(String::from("payload should be ignored"));
        let text = format_panic_text(payload);

        assert!(
            text.contains("stored panic message"),
            "formatted text did not contain stored panic message: {text}"
        );
        assert!(
            text.contains("src/lib.rs:12:34:"),
            "formatted text did not contain file/line/col: {text}"
        );

        assert!(text.contains("frame1"));
        assert!(text.contains("frame2"));
        assert!(
            !text.contains("<unknown>"),
            "formatted text should have had cleaned backtrace: {text}"
        );

        assert!(
            !text.contains("payload should be ignored"),
            "format_panic_text unexpectedly used fallback payload: {text}"
        );

        // PanicReport should remain in the history
        let after = last_panic_message();
        assert_eq!(
            after, "stored panic message",
            "last_panic_message should still return the stored panic, since we keep a history now"
        );
    }

    #[test]
    fn with_panic_guard_propagates_ok_and_does_not_touch_last_panic() {
        drain_last_panic();

        let result: Result<i32, ZingolibError> = with_panic_guard(|| Ok(123));
        assert_eq!(result.unwrap(), 123);

        // No panic
        let msg = last_panic_message();
        assert_eq!(msg, "");
    }

    #[test]
    fn with_panic_guard_propagates_err_without_using_from_panic() {
        drain_last_panic();

        let result: Result<(), ZingolibError> =
            with_panic_guard(|| Err(ZingolibError::LightclientNotInitialized));

        match result {
            Err(ZingolibError::LightclientNotInitialized) => {}
            other => panic!("Expected LightclientNotInitialized, got {other:?}"),
        }

        let msg = last_panic_message();
        assert_eq!(msg, "");
    }

    #[test]
    fn with_panic_guard_converts_panic_to_zingoliberror_panic_with_message() {
        drain_last_panic();

        let result: Result<(), ZingolibError> = with_panic_guard(|| {
            panic!("zingolib_error test panic");
        });

        match result {
            Err(ZingolibError::Panic(msg)) => {
                assert!(
                    msg.contains("zingolib_error test panic"),
                    "panic message did not contain original payload: {msg}"
                );
            }
            other => panic!("Expected ZingolibError::Panic, got {other:?}"),
        }
    }

    #[test]
    fn with_panic_guard_converts_panic_to_initerror_panic() {
        // Make sure we start from a clean slate
        drain_last_panic();

        let result: Result<(), InitError> = with_panic_guard(|| {
            panic!("init panic payload");
        });

        // Must be the [`InitError::Panic`] variant
        let err = match result {
            Err(e @ InitError::Panic(_)) => e,
            other => panic!("expected InitError::Panic, got {other:?}"),
        };

        // This is the raw payload captured by the panic hook
        let lp = last_panic_message();
        assert_eq!(lp, "init panic payload");

        // This is the fully formatted panic text file:line:col + payload + backtrace
        let formatted = err.to_string();

        // Should contain the raw payload
        assert!(
            formatted.contains(&lp),
            "formatted error does not contain payload: {formatted:?}",
        );

        // Should contain a backtrace header, proving format_panic_text was used
        assert!(
            formatted.contains("Backtrace:"),
            "formatted error does not contain a backtrace: {formatted:?}",
        );
    }

    #[test]
    fn with_panic_guard_converts_panic_to_configerror_panic() {
        drain_last_panic();

        let result: Result<(), ConfigError> = with_panic_guard(|| {
            panic!("config panic payload");
        });

        assert!(matches!(result, Err(ConfigError::Panic)));
    }

    #[test]
    fn with_panic_guard_converts_panic_to_seederror_panic() {
        drain_last_panic();

        let result: Result<(), SeedError> = with_panic_guard(|| {
            panic!("seed panic payload");
        });

        assert!(matches!(result, Err(SeedError::Panic)));
    }

    #[test]
    fn with_panic_guard_converts_panic_to_ufvkerror_panic() {
        drain_last_panic();

        let result: Result<(), UfvkError> = with_panic_guard(|| {
            panic!("ufvk panic payload");
        });

        assert!(matches!(result, Err(UfvkError::Panic)));
    }

    #[test]
    fn last_panic_message_returns_message_from_raw_panic_when_guard_is_not_used() {
        drain_last_panic();

        install_panic_hook_once();

        let res = panic::catch_unwind(|| {
            panic!("raw panic for last_panic_message");
        });
        assert!(res.is_err());

        let msg = last_panic_message();
        assert!(
            msg.contains("raw panic for last_panic_message"),
            "last_panic_message did not contain original panic payload: {msg}"
        );
    }

    #[test]
    fn check_b64_reports_true_for_valid_and_false_for_invalid_data() {
        let encoded = base64::engine::general_purpose::STANDARD.encode(b"hello world");
        assert_eq!(check_b64(encoded), "true");

        let invalid = "not base64!!";
        assert_eq!(check_b64(invalid.to_string()), "false");
    }
}
