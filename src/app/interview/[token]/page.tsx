"use client";

import { useState, useEffect, useRef, use } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function InterviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Start the interview (get first AI message)
  const startInterview = async () => {
    setStarting(true);
    setError("");
    try {
      const res = await fetch(`/api/interview/${token}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: null, message: null }),
      });

      if (res.status === 403) {
        const data = await res.json();
        setError(data.error || "This interview is not currently active.");
        setStarting(false);
        return;
      }

      if (res.status === 404) {
        setError("Interview not found.");
        setStarting(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to start interview.");
        setStarting(false);
        return;
      }

      const data = await res.json();
      setSessionToken(data.sessionToken);
      setMessages([{ role: "assistant", content: data.reply }]);
      setIsCompleted(data.isCompleted);
      setStarted(true);
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || isCompleted) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/interview/${token}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, message: userMessage }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to send message.");
        return;
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
      setIsCompleted(data.isCompleted);
    } catch {
      setError("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Not started yet
  if (!started) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-6">🎙️</div>
          <h1 className="text-2xl font-bold text-white mb-3">
            Interview Session
          </h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            You are about to participate in an AI-conducted interview. The
            interview will be recorded for research purposes. Your responses
            are anonymous unless you choose to share identifying information.
          </p>

          {error ? (
            <div className="bg-red-900/30 border border-red-700 rounded-xl px-6 py-4 text-red-400 mb-6">
              {error}
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-4 text-gray-400 text-sm mb-6 text-left space-y-2">
              <p>• The interview is conducted by an AI assistant</p>
              <p>• Answer questions at your own pace</p>
              <p>• Press Enter or click Send to submit your response</p>
              <p>• The session will end automatically when complete</p>
            </div>
          )}

          {!error && (
            <button
              onClick={startInterview}
              disabled={starting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-lg"
            >
              {starting ? "Starting..." : "Begin Interview"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white font-medium text-sm">
              Interview in Progress
            </span>
          </div>
          {isCompleted && (
            <span className="text-green-400 text-sm font-medium">
              ✓ Completed
            </span>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${
                msg.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-purple-700 text-white"
                }`}
              >
                {msg.role === "user" ? "You" : "AI"}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-sm"
                    : "bg-gray-800 text-gray-100 rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-sm text-white flex-shrink-0">
                AI
              </div>
              <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {isCompleted ? (
            <div className="text-center py-4">
              <p className="text-green-400 font-medium mb-1">
                ✓ Interview Complete
              </p>
              <p className="text-gray-500 text-sm">
                Thank you for your participation. You may close this window.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-3 bg-red-900/30 border border-red-700 rounded-lg px-4 py-2 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-3 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  rows={1}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-none text-sm leading-relaxed disabled:opacity-50"
                  placeholder="Type your response... (Enter to send, Shift+Enter for new line)"
                  style={{
                    minHeight: "48px",
                    maxHeight: "160px",
                    overflowY: "auto",
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-5 py-3 rounded-xl transition-colors flex-shrink-0"
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
