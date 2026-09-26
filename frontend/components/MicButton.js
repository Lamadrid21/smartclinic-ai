"use client";

import { useEffect, useRef, useState } from "react";

/**
 * MicButton — free Speech-to-Text using the browser Web Speech API.
 *
 * Important: although it is "free", transcription happens in the cloud — the
 * browser (Chrome/Edge) streams audio to Google's speech-recognition service.
 * A "network" error therefore means the browser lost contact with Google's
 * speech servers, NOT that the SmartClinic backend (ports 3000/4000) is down.
 *
 * Resilience notes:
 *  - Chrome's `continuous = true` mode is a well-known trigger of recurring
 *    "network" errors, so we run one-shot recognitions and auto-restart on
 *    `onend`. For the user the behaviour is identical to continuous dictation.
 *  - Chrome also fires `network` spuriously on flaky connections, so we
 *    transparently retry a few times before showing an error message.
 *
 * Props:
 *   onResult(text: string)  — called with each recognized utterance (final)
 *   onInterim(text: string) — optional live callback for in-progress text
 *   buttonLabel(string)     — optional accessible label (defaults to "Dictate")
 *   disabled(bool)          — optional disable state
 *   style(object)           — optional inline style overrides
 *   lang(string)            — optional default recognition locale (en-US)
 */

const MAX_NETWORK_RETRIES = 3;       // transient drop-outs are common
const NETWORK_RETRY_DELAY_MS = 900;  // give the connection a moment to recover

// Locales the user can pick from, so they can choose the language/model
// that best matches how they dictate.
const LOCALES = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "en-PH", label: "English (Philippines)" },
  { code: "es-ES", label: "Spanish (Spain)" },
  { code: "es-US", label: "Spanish (US)" },
  { code: "fr-FR", label: "French (France)" },
  { code: "de-DE", label: "German (Germany)" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
  { code: "pt-PT", label: "Portuguese (Portugal)" },
  { code: "it-IT", label: "Italian (Italy)" },
  { code: "nl-NL", label: "Dutch (Netherlands)" },
  { code: "tl-PH", label: "Filipino (Philippines)" },
  { code: "ja-JP", label: "Japanese" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
];

export default function MicButton({
  onResult,
  onInterim,
  buttonLabel = "🎤 Dictate",
  disabled = false,
  style,
  lang = "en-US",
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState("");
  const [chosenLang, setChosenLang] = useState(lang);
  const [showLangPicker, setShowLangPicker] = useState(false);
  /** Live preview strip shown next to the button while the mic is active. */
  const [livePreview, setLivePreview] = useState("");
  /** Commit feedback — set true briefly after text is successfully written. */
  const [justWritten, setJustWritten] = useState(false);
  /** How many utterances were successfully written this session. */
  const [commitCount, setCommitCount] = useState(0);
  /** The last recognized utterance that was written to the field. */
  const [lastCommitted, setLastCommitted] = useState("");

  const recognitionRef = useRef(null);
  const retryRef = useRef(0);           // network retries used this dictation session
  const listeningRef = useRef(false);   // the user still wants to dictate
  const stopTimerRef = useRef(null);    // pending auto-restart timers
  const pendingRef = useRef("");        // interim text not yet committed as final
  const commitTimerRef = useRef(null);  // auto-hide the "Written" badge
  const onResultRef = useRef(onResult);
  const onInterimRef = useRef(onInterim);
  const langRef = useRef(chosenLang);

  // Always invoke the latest callbacks without re-creating the recognition.
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onInterimRef.current = onInterim;
  }, [onInterim]);

  useEffect(() => {
    langRef.current = chosenLang;
  }, [chosenLang]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSupported(false);
    }

    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore abort errors during unmount
      }
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    };
  }, []);

  /** Commit pending interim text to onResult so it is never silently lost. */
  function flushPending() {
    if (pendingRef.current) {
      const text = pendingRef.current;
      pendingRef.current = "";
      setLivePreview("");
      if (onResultRef.current) onResultRef.current(text);
      showWrittenBadge(text);
    }
  }

  /** Visible confirmation that recognized text reached the parent field. */
  function showWrittenBadge(text) {
    setLastCommitted(text);
    setCommitCount((count) => count + 1);
    setJustWritten(true);
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = setTimeout(() => {
      setJustWritten(false);
      commitTimerRef.current = null;
    }, 2500);
  }

  function buildRecognition() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // One-shot + auto-restart (see onend) instead of continuous=true,
    // which avoids Chrome's recurring "network" errors in long sessions.
    recognition.continuous = false;
    recognition.interimResults = true;   // live preview while speaking
    recognition.lang = langRef.current;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      // Loop from 0 — Chrome keeps ALL results for the current one-shot
      // session in one SpeechRecognitionResultList. Starting at 0 ensures we
      // never miss a final result whose index falls before event.resultIndex,
      // which is a known Chrome quirk that silently drops text.
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }

      // Commit any finalised chunk immediately.
      const trimmedFinal = finalTranscript.trim();
      if (trimmedFinal) {
        retryRef.current = 0;
        pendingRef.current = "";                 // clear pending — it is now committed
        setLivePreview(interimTranscript.trim()); // only show what is still pending
        if (onResultRef.current) onResultRef.current(trimmedFinal);
        showWrittenBadge(trimmedFinal);
      }

      // Track interim text so that a press-to-stop can still flush it.
      const trimmedInterim = interimTranscript.trim();
      if (trimmedInterim) {
        pendingRef.current = trimmedInterim;
        setLivePreview(trimmedInterim);
        if (onInterimRef.current) onInterimRef.current(trimmedInterim);
      } else if (!trimmedFinal) {
        // Nothing new at all — clear the preview.
        setLivePreview("");
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "network") {
        // Flush any speech captured before the network hiccup so nothing is lost.
        flushPending();

        if (listeningRef.current && retryRef.current < MAX_NETWORK_RETRIES) {
          retryRef.current += 1;
          setError("Speech service hiccup — retrying…");
          try {
            recognition.abort();
          } catch {
            // ignore — the instance is being replaced anyway
          }
          stopTimerRef.current = setTimeout(() => {
            if (listeningRef.current) startRecognition();
          }, NETWORK_RETRY_DELAY_MS);
          return;
        }
        listeningRef.current = false;
        setListening(false);
        setError(
          "Speech service unavailable (network). Chrome uses Google's free speech service — check your internet connection, disable ad-blockers/extensions, or try Google Chrome/Edge."
        );
        return;
      }

      listeningRef.current = false;
      setListening(false);
      setError(
        event.error === "not-allowed"
          ? "Microphone permission was denied — allow it in the browser and try again."
          : event.error === "no-speech"
          ? "No speech detected. Try again."
          : event.error === "audio-capture"
          ? "Microphone input failed. Check that a microphone is connected and not in use."
          : `Speech error: ${event.error}`
      );
    };

    recognition.onend = () => {
      // --- KEY FIX: always commit any in-flight interim speech ---
      // When the user presses Stop, Chrome fires onend without always first
      // delivering a final onresult for the latest interim chunk.  The pending
      // ref tracks whatever the mic last heard — flush it now so text is never
      // silently lost.
      flushPending();

      // One-shot recognition finished a phrase. If the user still wants to
      // keep dictating, start a fresh recognition — mimicking continuous
      // mode without its stability problems.
      if (listeningRef.current) {
        startRecognition();
      } else {
        setLivePreview("");
        setListening(false);
      }
    };

    return recognition;
  }

  function startRecognition() {
    try {
      const recognition = buildRecognition();
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch (error) {
      // The API throws if start() is called while already active.
      try {
        recognitionRef.current?.abort();
      } catch {
        // no-op
      }
      setListening(false);
      listeningRef.current = false;
    }
  }

  function toggleListening() {
    setError("");

    if (listening) {
      listeningRef.current = false;
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      try {
        recognitionRef.current?.stop();
      } catch {
        try {
          recognitionRef.current?.abort();
        } catch {
          // ignore
        }
      }
      recognitionRef.current = null;
      setListening(false);
      retryRef.current = 0;
      return;
    }

    listeningRef.current = true;
    retryRef.current = 0;
    pendingRef.current = "";
    setLivePreview("");
    setCommitCount(0);
    setLastCommitted("");
    setJustWritten(false);
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    startRecognition();
  }

  if (!supported) {
    return (
      <span
        title="Your browser does not support speech-to-text."
        style={{
          fontSize: "12px",
          color: "#94a3b8",
          ...style,
        }}
      >
        🎤 Not supported in this browser (needs Chrome or Edge)
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap", ...style }}>
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        style={{
          padding: "8px 12px",
          border: "none",
          borderRadius: "6px",
          cursor: disabled ? "not-allowed" : "pointer",
          background: listening ? "#dc2626" : "#2563eb",
          color: "#fff",
          fontSize: "12px",
          fontWeight: "600",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {listening ? "🔴 Stop (listening…)" : buttonLabel}
      </button>

      {/* Input language selector — pick the language you speak into the mic */}
      <span style={{ position: "relative", display: "inline-flex" }}>
        <button
          type="button"
          disabled={disabled || listening}
          onClick={() => setShowLangPicker((v) => !v)}
          title="Choose the language you speak"
          style={{
            padding: "6px 10px",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            cursor: disabled || listening ? "not-allowed" : "pointer",
            background: "#f8fafc",
            color: "#334155",
            fontSize: "12px",
            fontWeight: "600",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          🌐 {chosenLang}
          <span style={{ fontSize: "10px" }}>▼</span>
        </button>

        {showLangPicker && (
          <span
            onClick={() => setShowLangPicker(false)}
            style={{ position: "fixed", inset: 0, zIndex: 5 }}
          />
        )}

        {showLangPicker && (
          <span
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              zIndex: 10,
              background: "#fff",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              boxShadow: "0 4px 16px rgba(15,23,42,0.15)",
              padding: "4px",
              display: "flex",
              flexDirection: "column",
              maxHeight: "220px",
              overflowY: "auto",
              minWidth: "180px",
            }}
          >
            {LOCALES.map((locale) => (
              <button
                key={locale.code}
                type="button"
                onClick={() => {
                  setChosenLang(locale.code);
                  setShowLangPicker(false);
                }}
                style={{
                  padding: "6px 10px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  background: chosenLang === locale.code ? "#e0e7ff" : "transparent",
                  color: chosenLang === locale.code ? "#3730a3" : "#334155",
                  fontSize: "12px",
                  textAlign: "left",
                }}
              >
                {locale.label}
                {chosenLang === locale.code ? " ✓" : ""}
              </button>
            ))}
          </span>
        )}
      </span>

      {error && (
        <span
          style={{
            fontSize: "12px",
            color: "#f87171",
          }}
        >
          {error}
        </span>
      )}

      {/* Live preview — shows recognized text while the mic is active so the
          user gets immediate feedback that speech is being captured. */}
      {listening && livePreview && (
        <span
          style={{
            fontSize: "12px",
            color: "#64748b",
            fontStyle: "italic",
            maxWidth: "260px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={livePreview}
        >
          🗣️ &quot;{livePreview}&quot;
        </span>
      )}

      {/* Commit confirmation — proves recognized text reached the text field. */}
      {(justWritten || commitCount > 0) && (
        <span
          style={{
            fontSize: "12px",
            fontWeight: "600",
            color: justWritten ? "#16a34a" : "#94a3b8",
            background: justWritten ? "#dcfce7" : "#f1f5f9",
            border: `1px solid ${justWritten ? "#86efac" : "#e2e8f0"}`,
            borderRadius: "999px",
            padding: "2px 10px",
            maxWidth: "260px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            transition: "all 0.2s ease",
          }}
          title={lastCommitted}
        >
          {justWritten ? "✅ Written" : "✓"} {commitCount === 1 ? "1 text" : `${commitCount} texts`} added
          {justWritten && lastCommitted ? `: "${lastCommitted}"` : ""}
        </span>
      )}
    </span>
  );
}