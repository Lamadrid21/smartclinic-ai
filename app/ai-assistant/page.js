"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AIAssistant() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  async function askAI() {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        content: userMessage,
      },
    ]);

    setMessage("");
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const result = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          patientId: user?.id || null,
        }),
      });

      const responseText = await result.text();

      let data;

      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error("Server returned invalid JSON:", responseText);
        throw new Error("The AI server returned an invalid response.");
      }

      if (!result.ok) {
        throw new Error(data.error || "AI request failed.");
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.response || "SmartClinic AI did not return a response.",
        },
      ]);

      if (user) {
        const { error } = await supabase.from("ai_usage_logs").insert({
          user_id: user.id,
          message: userMessage,
          response: data.response,
        });

        if (error) {
          console.error("Usage logging error:", error);
        }
      }
    } catch (error) {
      console.error("AI error:", error);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: error.message || "SmartClinic AI is temporarily unavailable.",
        },
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
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-6 text-white">
          <h1 className="text-3xl font-bold">SmartClinic AI</h1>
          <p className="mt-1 text-blue-100">Your clinic information assistant</p>
        </div>

        <div className="h-[500px] overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center mt-32">
              <h2 className="text-2xl font-bold text-black">How can I help you?</h2>
              <p className="text-gray-600 mt-2">
                Ask about clinic hours, appointments, FAQs, or general health information.
              </p>
            </div>
          )}

          {messages.map((item, index) => (
            <div
              key={index}
              className={item.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  item.role === "user"
                    ? "max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-br-md px-5 py-3"
                    : "max-w-[80%] bg-gray-100 text-black rounded-2xl rounded-bl-md px-5 py-3"
                }
              >
                <p className="whitespace-pre-wrap leading-6">{item.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-black rounded-2xl px-5 py-3">
                SmartClinic AI is thinking...
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-5">
          <div className="flex gap-3">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask SmartClinic AI..."
              rows={2}
              className="flex-1 resize-none border border-gray-300 rounded-2xl p-4 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={askAI}
              disabled={loading || !message.trim()}
              className="px-6 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "..." : "Send"}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            SmartClinic AI provides general information and does not replace professional medical advice.
          </p>

          <a href="/dashboard" className="block text-center mt-4 text-black hover:underline">
            Back to Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}