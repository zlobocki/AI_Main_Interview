"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Interview {
  id: number;
  name: string;
  token: string;
  interviewPrompt: string | null;
  aggregationPrompt: string | null;
  welcomeMessage: string | null;
  tokenLimit: number;
  isActive: boolean;
  aiProvider: string;
  aiModel: string;
}

interface Participant {
  id: number;
  email: string;
}

const AI_MODELS = [
  { provider: "openai", model: "gpt-4o", label: "GPT-4o (OpenAI)" },
  { provider: "openai", model: "gpt-4o-mini", label: "GPT-4o Mini (OpenAI)" },
  { provider: "openai", model: "gpt-4-turbo", label: "GPT-4 Turbo (OpenAI)" },
  { provider: "openai", model: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (OpenAI)" },
];

export default function ManageInterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Form state
  const [interviewPrompt, setInterviewPrompt] = useState("");
  const [aggregationPrompt, setAggregationPrompt] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [tokenLimit, setTokenLimit] = useState(5000);
  const [aiModel, setAiModel] = useState("gpt-4o");

  // Participant state
  const [newEmail, setNewEmail] = useState("");
  const [addingEmail, setAddingEmail] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<number | null>(null);
  const [editEmail, setEditEmail] = useState("");

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Link copy
  const [linkCopied, setLinkCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [iRes, pRes] = await Promise.all([
        fetch(`/api/interviews/${id}`),
        fetch(`/api/interviews/${id}/participants`),
      ]);
      if (iRes.ok) {
        const data = await iRes.json();
        setInterview(data);
        setInterviewPrompt(data.interviewPrompt || "");
        setAggregationPrompt(data.aggregationPrompt || "");
        setWelcomeMessage(data.welcomeMessage || "");
        setTokenLimit(data.tokenLimit || 5000);
        setAiModel(data.aiModel || "gpt-4o");
      }
      if (pRes.ok) {
        setParticipants(await pRes.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const save = async (fields: Partial<Interview>) => {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch(`/api/interviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        const updated = await res.json();
        setInterview(updated);
        setSaveMsg("Saved!");
        setTimeout(() => setSaveMsg(""), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrompts = () => {
    save({ interviewPrompt, aggregationPrompt, welcomeMessage, tokenLimit, aiModel });
  };

  const toggleActive = () => {
    save({ isActive: !interview?.isActive });
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAddingEmail(true);
    try {
      const res = await fetch(`/api/interviews/${id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });
      if (res.ok) {
        setParticipants(await res.json());
        setNewEmail("");
      }
    } finally {
      setAddingEmail(false);
    }
  };

  const handleEditParticipant = async (pid: number) => {
    if (!editEmail.trim()) return;
    try {
      const res = await fetch(`/api/interviews/${id}/participants/${pid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: editEmail }),
      });
      if (res.ok) {
        setParticipants((prev) =>
          prev.map((p) => (p.id === pid ? { ...p, email: editEmail } : p))
        );
        setEditingParticipant(null);
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteParticipant = async (pid: number) => {
    try {
      await fetch(`/api/interviews/${id}/participants/${pid}`, {
        method: "DELETE",
      });
      setParticipants((prev) => prev.filter((p) => p.id !== pid));
    } catch {
      // ignore
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/interviews/${id}`, { method: "DELETE" });
      router.push("/admin");
    } finally {
      setDeleting(false);
    }
  };

  const interviewLink = interview
    ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/interview/${interview.token}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(interviewLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Interview not found</p>
          <Link href="/admin" className="text-blue-400 hover:text-blue-300">
            ← Back to admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              ← Interviews
            </Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-white font-semibold">{interview.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            {saveMsg && (
              <span className="text-green-400 text-sm">{saveMsg}</span>
            )}
            <Link
              href={`/admin/interviews/${id}/results`}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              View Results
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Status & Link */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Interview Status & Link
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Status toggle */}
            <div className="flex-1 bg-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">Status</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    interview.isActive
                      ? "bg-green-900/40 text-green-400 border border-green-800"
                      : "bg-gray-700 text-gray-400 border border-gray-600"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      interview.isActive ? "bg-green-400" : "bg-gray-500"
                    }`}
                  />
                  {interview.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <button
                onClick={toggleActive}
                disabled={saving}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                  interview.isActive
                    ? "bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-800"
                    : "bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-800"
                }`}
              >
                {interview.isActive ? "Stop Interview" : "Start Interview"}
              </button>
            </div>

            {/* Link */}
            <div className="flex-[2] bg-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-2">Interview Link</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={interviewLink}
                  readOnly
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono truncate"
                />
                <button
                  onClick={copyLink}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                >
                  {linkCopied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {interview.isActive
                  ? "Link is active — participants can join"
                  : "Link is inactive — start the interview to allow access"}
              </p>
            </div>
          </div>
        </div>

        {/* AI Model */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">AI Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">AI Model</label>
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                {AI_MODELS.map((m) => (
                  <option key={m.model} value={m.model}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Token Limit per Session
              </label>
              <input
                type="number"
                value={tokenLimit}
                onChange={(e) => setTokenLimit(parseInt(e.target.value) || 5000)}
                min={500}
                max={50000}
                step={500}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default: 5,000 tokens (~30–40 exchanges)
              </p>
            </div>
          </div>
        </div>

        {/* Interview Prompt */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-1">
            Interview Prompt
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Instructions for the AI interviewer. Describe the questions to ask,
            tone, and any specific topics to cover.
          </p>
          <textarea
            value={interviewPrompt}
            onChange={(e) => setInterviewPrompt(e.target.value)}
            rows={8}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-y font-mono text-sm"
            placeholder="You are a professional interviewer conducting a user research interview. Your goal is to understand the participant's experience with our product.

Start by introducing yourself and asking the participant to briefly describe their role.

Then explore:
1. How they currently use the product
2. What challenges they face
3. What improvements they'd like to see

Ask follow-up questions to dig deeper. Be conversational and empathetic."
          />
        </div>

        {/* Welcome Message */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-1">
            Welcome Message
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Message sent to participants. The interview link will be included
            automatically.
          </p>
          <textarea
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            rows={5}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-y"
            placeholder="Dear participant,

You are invited to take part in our interview study. The interview is conducted by an AI assistant and takes approximately 15-20 minutes.

Your responses are anonymous and will be used to improve our product.

Click the link below to begin:"
          />
        </div>

        {/* Aggregation Prompt */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-1">
            Data Aggregation Prompt
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Instructions for how the AI should summarize and analyze all
            interview responses.
          </p>
          <textarea
            value={aggregationPrompt}
            onChange={(e) => setAggregationPrompt(e.target.value)}
            rows={6}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-y font-mono text-sm"
            placeholder="Analyze the following interview transcripts and provide:

1. Key themes and patterns across all participants
2. Most common pain points mentioned
3. Most requested features or improvements
4. Notable quotes that illustrate key findings
5. Overall sentiment analysis
6. Recommendations based on the findings

Structure your analysis with clear headings and bullet points."
          />
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            onClick={handleSavePrompts}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Participants */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-1">
            Participants
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Email addresses of interview participants (for record keeping).
          </p>

          {/* Add participant */}
          <form onSubmit={handleAddParticipant} className="flex gap-2 mb-4">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              placeholder="participant@example.com"
            />
            <button
              type="submit"
              disabled={addingEmail || !newEmail.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors"
            >
              Add
            </button>
          </form>

          {/* Participant list */}
          {participants.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No participants added yet
            </p>
          ) : (
            <div className="space-y-2">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-2.5"
                >
                  {editingParticipant === p.id ? (
                    <>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleEditParticipant(p.id)}
                        className="text-green-400 hover:text-green-300 text-sm font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingParticipant(null)}
                        className="text-gray-400 hover:text-gray-300 text-sm"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-gray-300 text-sm">{p.email}</span>
                      <button
                        onClick={() => {
                          setEditingParticipant(p.id);
                          setEditEmail(p.email);
                        }}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteParticipant(p.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div className="bg-gray-900 rounded-2xl border border-red-900/50 p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-1">
            Danger Zone
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Permanently delete this interview and all associated data.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-800 font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Delete Interview
          </button>
        </div>
      </main>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-2">
              Delete Interview?
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              This will permanently delete &quot;{interview.name}&quot; and all
              associated sessions, messages, and results. This action cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
