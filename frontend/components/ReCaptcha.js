"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

/**
 * Google reCAPTCHA v2 ("I'm not a robot" checkbox) wrapper.
 *
 * Requires NEXT_PUBLIC_RECAPTCHA_SITE_KEY in the frontend env
 * (see frontend/.env.local). Create one at
 * https://www.google.com/recaptcha/admin  →  reCAPTCHA v2 → "I'm not a robot".
 *
 * If the key is missing (or the widget fails to load, e.g. offline) the
 * component shows a warning instead of a checkbox, so the CAPTCHA can NEVER
 * be bypassed — the backend must also verify the token server-side.
 *
 * Props:
 *   onChange(passed: boolean) — called when the human-check passes / fails.
 *
 * Ref handle:
 *   getToken() — the current Google reCAPTCHA response token (null if not
 *                completed). Send this to the backend for verification.
 *   reset()    — resets the widget. Call this after a submit attempt because
 *                reCAPTCHA tokens are single-use.
 */
const ReCaptcha = forwardRef(function ReCaptcha({ onChange }, ref) {
  const siteKey = (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "").trim();
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const tokenRef = useRef(null);
  const [widgetFailed, setWidgetFailed] = useState(false);

  // Called whenever the token changes. `token` is the reCAPTCHA response
  // string that must be sent to the backend for server-side verification.
  const notify = useCallback(
    (passed, token = null) => {
      tokenRef.current = passed ? token : null;
      onChange?.(passed);
    },
    [onChange]
  );

  function renderWidget() {
    if (
      typeof window === "undefined" ||
      !window.grecaptcha ||
      !containerRef.current ||
      widgetIdRef.current !== null
    ) {
      return;
    }

    widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token) => notify(true, token),
      "expired-callback": () => notify(false),
      "error-callback": () => notify(false),
    });
  }

  useImperativeHandle(
    ref,
    () => ({
      // Current Google reCAPTCHA response token (null if not completed).
      getToken() {
        return tokenRef.current;
      },
      reset() {
        if (
          typeof window !== "undefined" &&
          window.grecaptcha &&
          widgetIdRef.current !== null
        ) {
          try {
            window.grecaptcha.reset(widgetIdRef.current);
          } catch {
            // ignore — widget may be reloading
          }
        }
        notify(false);
      },
    }),
    [notify]
  );

  useEffect(() => {
    if (!siteKey || typeof window === "undefined") {
      return;
    }

    // Script already loaded (or widget already rendered).
    if (window.grecaptcha) {
      renderWidget();
      return;
    }

    // Avoid double-loading the script in React Strict Mode / HMR.
    if (window.__recaptchaScriptLoading) {
      return;
    }

    window.__recaptchaScriptLoading = true;
    window.reCAPTCHAonLoad = () => {
      window.__recaptchaScriptLoading = false;
      renderWidget();
    };

    const script = document.createElement("script");
    script.src =
      "https://www.google.com/recaptcha/api.js?onload=reCAPTCHAonLoad&render=explicit";
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      window.__recaptchaScriptLoading = false;
      setWidgetFailed(true);
    };
    document.head.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  const useFallback = !siteKey || widgetFailed;

  return (
    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
      {useFallback ? (
        <p className="text-xs text-amber-300/90 leading-relaxed">
          ⚠️ Google reCAPTCHA is not configured yet. Add{" "}
          <code className="text-amber-200">NEXT_PUBLIC_RECAPTCHA_SITE_KEY</code>{" "}
          to <code className="text-amber-200">frontend/.env.local</code> to
          enable registration and login.
        </p>
      ) : (
        <>
          <p className="text-xs font-semibold text-slate-300 mb-2">
            🤖 Prove you are human
          </p>
          <div ref={containerRef} />
        </>
      )}
    </div>
  );
});

export default ReCaptcha;