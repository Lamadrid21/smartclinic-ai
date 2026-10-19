"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/AppLayout";

const markdownComponents = {
  h1: ({ children }) => (
    <h1 className="text-lg font-bold text-heading mt-3 mb-2 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-bold text-heading mt-3 mb-1.5 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-bold text-heading mt-2 mb-1 first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-heading mt-2 mb-1 first:mt-0">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-sm font-semibold text-heading mt-2 mb-1 first:mt-0">{children}</h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-sm font-medium text-heading mt-2 mb-1 first:mt-0">{children}</h6>
  ),
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="list-disc pl-5 mb-2 space-y-0.5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 mb-2 space-y-0.5 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="mb-0.5">{children}</li>,
  strong: ({ children }) => (
    <strong className="text-heading font-semibold">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => (
    <code className="bg-[var(--surface-2)] px-1.5 py-0.5 rounded text-xs text-cyan-300 font-mono">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-3 my-2 overflow-x-auto text-xs leading-5">{children}</pre>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-blue-500/40 pl-3 my-2 italic text-muted-c">{children}</blockquote>
  ),
  hr: () => <hr className="border-[var(--card-border)] my-3" />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-[var(--card-border)] px-2 py-1 text-left bg-[var(--surface-2)] text-heading">{children}</th>
  ),
  td: ({ children }) => <td className="border border-[var(--card-border)] px-2 py-1">{children}</td>,
};

export default function AIAssistant() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const suggestions = [
    "What are the clinic opening hours?",
    "How do I schedule an appointment?",
    "How much is a consultation fee?",
    "What documents do I need for surgery?",
  ];

  async function askAI(clicked) {
    const userMessage = (clicked || message).trim();
    if (!userMessage || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setMessage("");
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const result = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ message: userMessage }),
      });
      const responseText = await result.text();
      let data;
      try { data = JSON.parse(responseText); } catch (e) { throw new Error("The AI server returned an invalid response."); }
      if (!result.ok) throw new Error(data.error || "AI request failed.");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response || "SmartClinic AI did not return a response." },
      ]);
    } catch (error) {
      console.error("AI error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: error.message || "SmartClinic AI is temporarily unavailable." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      askAI();
    }
  }

  return (
    <AppLayout title="SmartClinic AI" subtitle="Your clinical information assistant" activeNav="ai">
      <div className="glass-card rounded-2xl overflow-hidden flex flex-col m-vh" style={{ minHeight: "calc(100vh - 210px)" }}>
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-[var(--card-border)] bg-gradient-to-r from-blue-600/20 via-indigo-600/10 to-cyan-500/20 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m12 3-1.9 5.8a2 2 0 01-1.3 1.3L3 12l5.8 1.9a2 2 0 011.3 1.3L12 21l1.9-5.8a2 2 0 011.3-1.3L21 12l-5.8-1.9a2 2 0 01-1.3-1.3Z"/></svg>
          </div>
          <div>
            <h3 className="font-semibold text-heading">SmartClinic AI Assistant</h3>
            <p className="text-xs text-muted-c flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online • Powered by Groq AI
            </p>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-5" style={{ minHeight: "400px" }}>
          {messages.length === 0 && (
            <div className="text-center mt-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center text-3xl mx-auto mb-5">🤖</div>
              <h2 className="text-2xl font-bold text-heading">How can I help you?</h2>
              <p className="text-muted-c mt-2 max-w-md mx-auto text-sm leading-relaxed">
                Ask about clinic hours, appointment scheduling, fees, medical procedures, or general health information.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 max-w-2xl mx-auto m-stack">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => askAI(s)} className="text-left px-4 py-3 rounded-xl bg-white/[0.03] border border-[var(--card-border)] text-xs text-body hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-white transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((item, index) => (
            <div key={index} className={item.role === "user" ? "flex justify-end" : "flex justify-start"}>
              {item.role === "user" ? (
                <div className="max-w-[80%] px-5 py-3.5 text-sm leading-6 whitespace-pre-wrap rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-md shadow-lg shadow-blue-500/20">
                  {item.content}
                </div>
              ) : (
                <div className="max-w-[80%] px-5 py-3.5 text-sm leading-6 rounded-2xl bg-white/[0.06] border border-[var(--card-border)] text-heading rounded-bl-md">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {item.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/[0.06] border border-[var(--card-border)] text-body px-5 py-3.5 rounded-2xl rounded-bl-md flex items-center gap-2.5">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
                <span className="text-xs">SmartClinic AI is thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-[var(--card-border)] p-4 sm:p-6 bg-[var(--card-bg)]">
          <div className="flex gap-3">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask SmartClinic AI anything about the clinic..."
              rows={2}
              className="glass-input flex-1 resize-none rounded-2xl px-4 py-3 text-sm"
            />
            <button
              onClick={() => askAI()}
              disabled={loading || !message.trim()}
              className="btn-primary px-6 rounded-2xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
          <p className="text-[11px] text-muted-c mt-3">
            SmartClinic AI provides general information and does not replace professional medical advice.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}