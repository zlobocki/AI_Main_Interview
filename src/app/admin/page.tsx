"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

interface Interview {
  id: number;
  name: string;
  token: string;
  isActive: boolean;
  createdAt: string;
  tokenLimit: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const fetchInterviews = useCallback(async () => {
    try {
      const res = await fetch("/api/interviews");
      if (res.ok) {
        const data = await res.json();
        setInterviews(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!newName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");

      setInterviews((prev) => [...prev, data]);
      setShowNewModal(false);
      setNewName("");
      router.push(`/admin/interviews/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create interview");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Interview Platform</h1>
            <p className="text-sm text-gray-400">Admin Panel</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Interviews</h2>
            <p className="text-gray-400 mt-1">
              {interviews.length} interview{interviews.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <button
            onClick={() => { setShowNewModal(true); setError(""); setNewName(""); }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span>
            Add new interview
          </button>
        </div>

        {/* Interview table */}
        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading...</div>
        ) : interviews.length === 0 ? (
          <div className="text-center py-16 bg-gray-900 rounded-2xl border border-gray-800">
            <div className="text-4xl mb-4">🎙️</div>
            <p className="text-gray-400 text-lg mb-2">No interviews yet</p>
            <p className="text-gray-500 text-sm">
              Click &quot;Add new interview&quot; to get started
            </p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">
                    Name
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">
                    Token Limit
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400">
                    Created
                  </th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {interviews.map((interview, i) => (
                  <tr
                    key={interview.id}
                    onClick={() => router.push(`/admin/interviews/${interview.id}`)}
                    className={`cursor-pointer hover:bg-gray-800 transition-colors ${
                      i < interviews.length - 1 ? "border-b border-gray-800" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">{interview.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          interview.isActive
                            ? "bg-green-900/40 text-green-400 border border-green-800"
                            : "bg-gray-800 text-gray-400 border border-gray-700"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            interview.isActive ? "bg-green-400" : "bg-gray-500"
                          }`}
                        />
                        {interview.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {interview.tokenLimit.toLocaleString()} tokens
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {new Date(interview.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-gray-500 text-sm">Manage →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* New Interview Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">
              New Interview
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Interview Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Q1 Customer Feedback"
                  autoFocus
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must be unique across all interviews
                </p>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowNewModal(false); setError(""); }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
