"use client";

import { useEffect, useRef, useState } from "react";
import MicButton from "@/components/MicButton";

/**
 * DictationField — a labelled text field paired with a dictation microphone.
 *
 * Combines the label, the "🎤 Dictate" MicButton and the field itself so every
 * dictation-enabled field is consistent, and — most importantly — gives the
 * user *visible proof* that both halves of the dictation pipeline worked:
 *
 *   1. The mic captured speech (MicButton shows the live 🗣️ preview and its
 *      own "✅ Written" badge while recording).
 *   2. The recognized text actually landed in THIS field (the field flashes
 *      green and a "Dictated & written to this field" message appears below
 *      it with the exact text that was inserted).
 *
 * Props:
 *   label(string)        — field label rendered as <strong>
 *   value(string)        — controlled field value
 *   onChange(fn)         — the React state setter (receives new string)
 *   rows(number)         — textarea rows (default 3)
 *   placeholder(string)  — placeholder text
 *   inputType(string)    — "textarea" (default) or "input"
 *   micLabel(string)     — optional label for the Dictate button
 *   style(object)        — extra styles for the outer wrapper
 *   fieldStyle(object)   — extra styles for the textarea/input
 */
export default function DictationField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder = "",
  inputType = "textarea",
  micLabel = "🎤 Dictate",
  style,
  fieldStyle,
}) {
  const [flashing, setFlashing] = useState(false);
  const [lastWritten, setLastWritten] = useState("");
  const flashTimerRef = useRef(null);

  // Clean up any pending flash timers on unmount.
  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  /** Append dictated text to the field and light up the confirmation flash. */
  function handleDictate(text) {
    const clean = text.trim();
    if (!clean) return;

    onChange((current) => (current ? current.trimEnd() + " " : "") + clean);
    setLastWritten(clean);
    setFlashing(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => {
      setFlashing(false);
      flashTimerRef.current = null;
    }, 2600);
  }

  const baseFieldStyle = {
    width: "100%",
    padding: "12px",
    marginTop: "6px",
    border: flashing ? "2px solid #22c55e" : "1px solid #ccc",
    borderRadius: "6px",
    background: flashing ? "#f0fdf4" : "#fff",
    outline: "none",
    boxShadow: flashing ? "0 0 0 3px rgba(34,197,94,0.15)" : "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
  };

  if (inputType === "textarea") {
    baseFieldStyle.resize = "vertical";
  }

  return (
    <div style={{ marginBottom: "15px", ...style }}>
      <label>
        <strong>{label}</strong>
      </label>
      <div style={{ marginBottom: "8px", marginTop: "4px" }}>
        <MicButton onResult={handleDictate} buttonLabel={micLabel} />
      </div>

      {inputType === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          style={{ ...baseFieldStyle, ...fieldStyle }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...baseFieldStyle, ...fieldStyle }}
        />
      )}

      {/* Visible proof that dictated text was written to THIS field. */}
      {flashing && (
        <p
          style={{
            margin: "6px 0 0",
            fontSize: "12px",
            fontWeight: "600",
            color: "#16a34a",
          }}
        >
          ✅ Dictated &amp; written to this field: “{lastWritten}”
        </p>
      )}
    </div>
  );
}