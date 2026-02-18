"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";

interface Session {
  id: number;
  sessionToken: string;
  tokensUsed: number;
  isCompleted: boolean;
  startedAt: string;
  completedAt: string | null;
}

interface AggregationResult {
  id: number;
  result: string;
  sessionCount: number;
  generatedAt: string;
}

interface ResultsData {
  sessions: Session[];
  latestAggregation: AggregationResult | null;
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [aggregation, setAggregation] = useState<string>("");
  const [interviewName, setInterviewName] = useState("");
  const [expandedSession, setExpandedSession] = useState<number | null>(null);
  const [sessionMessages, setSessionMessages] = useState<
    Record<number, { role: string; content: string; createdAt: string }[]>
  >({});

  const fetchData = useCallback(async () => {
    try {
      const [rRes, iRes] = await Promise.all([
        fetch(`/api/interviews/${id}/results`),
        fetch(`/api/interviews/${id}`),
      ]);
      if (rRes.ok) {
        const d = await rRes.json();
        setData(d);
        if (d.latestAggregation) {
          setAggregation(d.latestAggregation.result);
        }
      }
      if (iRes.ok) {
        const i = await iRes.json();
        setInterviewName(i.name);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/interviews/${id}/results`, {
        method: "POST",
      });
      if (res.ok) {
        const d = await res.json();
        setAggregation(d.result);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to generate");
      }
    } finally {
      setGenerating(false);
    }
  };

  const loadSessionMessages = async (sessionId: number, token: string) => {
    if (sessionMessages[sessionId]) {
      setExpandedSession(expandedSession === sessionId ? null : sessionId);
      return;
    }
    try {
      const res = await fetch(
        `/api/interview/${token}/chat?session=${token}`
      );
      // We need to get messages differently - use a dedicated endpoint
      const msgRes = await fetch(`/api/interviews/${id}/sessions/${sessionId}`);
      if (msgRes.ok) {
        const msgs = await msgRes.json();
        setSessionMessages((prev) => ({ ...prev, [sessionId]: msgs }));
        setExpandedSession(sessionId);
      }
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/interviews/${id}`}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              ← Manage Interview
            </Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-white font-semibold">
              Results: {interviewName}
            </h1>
          </div>
          <a
            href={`/api/interviews/${id}/download`}
            className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            ↓ Download CSV
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Total Sessions",
              value: data?.sessions.length || 0,
            },
            {
              label: "Completed",
              value: data?.sessions.filter((s) => s.isCompleted).length || 0,
            },
            {
              label: "In Progress",
              value: data?.sessions.filter((s) => !s.isCompleted).length || 0,
            },
            {
              label: "Avg Tokens",
              value:
                data?.sessions.length
                  ? Math.round(
                      data.sessions.reduce((a, s) => a + s.tokensUsed, 0) /
                        data.sessions.length
                    ).toLocaleString()
                  : "—",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-900 rounded-xl border border-gray-800 p-4"
            >
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* AI Aggregation */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                AI Analysis Summary
              </h2>
              {data?.latestAggregation && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Generated{" "}
                  {new Date(
                    data.latestAggregation.generatedAt
                  ).toLocaleString()}{" "}
                  from {data.latestAggregation.sessionCount} sessions
                </p>
              )}
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || !data?.sessions.length}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {generating ? "Generating..." : "Generate / Refresh"}
            </button>
          </div>

          {aggregation ? (
            <div className="bg-gray-800 rounded-xl p-4 text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
              {aggregation}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-xl p-8 text-center text-gray-500">
              <p className="mb-2">No analysis generated yet</p>
              <p className="text-xs">
                Click &quot;Generate&quot; to analyze all interview sessions
              </p>
            </div>
          )}
        </div>

        {/* Sessions list */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Interview Sessions ({data?.sessions.length || 0})
          </h2>

          {!data?.sessions.length ? (
            <p className="text-gray-500 text-sm text-center py-8">
              No sessions yet
            </p>
          ) : (
            <div className="space-y-2">
              {data.sessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedSession(
                        expandedSession === s.id ? null : s.id
                      )
                    }
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-750 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          s.isCompleted ? "bg-green-400" : "bg-yellow-400"
                        }`}
                      />
                      <span className="text-gray-300 text-sm font-mono">
                        Session #{s.id}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {new Date(s.startedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500 text-xs">
                        {s.tokensUsed.toLocaleString()} tokens
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          s.isCompleted
                            ? "bg-green-900/40 text-green-400"
                            : "bg-yellow-900/40 text-yellow-400"
                        }`}
                      >
                        {s.isCompleted ? "Completed" : "In Progress"}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {expandedSession === s.id ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>

                  {expandedSession === s.id && (
                    <SessionTranscript sessionId={s.id} interviewId={id} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SessionTranscript({
  sessionId,
  interviewId,
}: {
  sessionId: number;
  interviewId: string;
}) {
  const [messages, setMessages] = useState<
    { id: number; role: string; content: string; createdAt: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/interviews/${interviewId}/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setMessages(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sessionId, interviewId]);

  if (loading) {
    return (
      <div className="px-4 py-3 border-t border-gray-700 text-gray-500 text-sm">
        Loading transcript...
      </div>
    );
  }

  return (
    <div className="border-t border-gray-700 px-4 py-3 space-y-3 max-h-96 overflow-y-auto">
      {messages.length === 0 ? (
        <p className="text-gray-500 text-sm">No messages in this session</p>
      ) : (
        messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${
              m.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            <div
              className={`text-xs font-semibold px-1 pt-1 whitespace-nowrap ${
                m.role === "user" ? "text-blue-400" : "text-purple-400"
              }`}
            >
              {m.role === "user" ? "Participant" : "AI"}
            </div>
            <div
              className={`flex-1 text-sm rounded-lg px-3 py-2 ${
                m.role === "user"
                  ? "bg-blue-900/30 text-blue-100"
                  : "bg-gray-700 text-gray-200"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
