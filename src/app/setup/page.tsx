"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [prefillLoaded, setPrefillLoaded] = useState(false);
  const [form, setForm] = useState({
    adminUsername: "",
    adminPassword: "",
    adminPasswordConfirm: "",
    dbHost: "localhost",
    dbPort: "3306",
    dbUser: "",
    dbPassword: "",
    dbName: "interview_app",
    openaiApiKey: "",
    appUrl: "",
  });

  // Pre-fill DB fields from current environment variables (important on Railway
  // where DB credentials are set as env vars and must match what the app uses)
  useEffect(() => {
    fetch("/api/setup/prefill")
      .then((r) => r.json())
      .then((data) => {
        setForm((f) => ({
          ...f,
          dbHost: data.dbHost || f.dbHost,
          dbPort: data.dbPort || f.dbPort,
          dbUser: data.dbUser || f.dbUser,
          dbName: data.dbName || f.dbName,
          appUrl: data.appUrl || f.appUrl,
          // Leave dbPassword blank — user must enter it (we can't expose it)
        }));
        setPrefillLoaded(true);
      })
      .catch(() => setPrefillLoaded(true));
  }, []);

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.adminPassword !== form.adminPasswordConfirm) {
      setError("Passwords do not match");
      return;
    }
    if (form.adminPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Setup failed");
      router.push("/admin/login?setup=complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Interview Platform</h1>
          <p className="text-gray-400">First-time setup wizard</p>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
          {/* Step indicator */}
          <div className="flex items-center mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    step >= s
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-500"
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-colors ${
                      step > s ? "bg-blue-600" : "bg-gray-800"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Admin credentials */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Admin Account
                </h2>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={form.adminUsername}
                    onChange={(e) => update("adminUsername", e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    placeholder="admin"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={form.adminPassword}
                    onChange={(e) => update("adminPassword", e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Min. 8 characters"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={form.adminPasswordConfirm}
                    onChange={(e) =>
                      update("adminPasswordConfirm", e.target.value)
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Repeat password"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!form.adminUsername || !form.adminPassword) {
                      setError("Please fill in all fields");
                      return;
                    }
                    if (form.adminPassword !== form.adminPasswordConfirm) {
                      setError("Passwords do not match");
                      return;
                    }
                    if (form.adminPassword.length < 8) {
                      setError("Password must be at least 8 characters");
                      return;
                    }
                    setError("");
                    setStep(2);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
                >
                  Next →
                </button>
              </div>
            )}

            {/* Step 2: Database */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Database Configuration
                </h2>
                {prefillLoaded && (form.dbHost !== "localhost" || form.dbUser) && (
                  <div className="bg-blue-900/30 border border-blue-700 rounded-lg px-4 py-3 text-blue-300 text-sm">
                    ℹ️ Fields pre-filled from your current environment configuration. Please verify they are correct and enter your database password.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Host
                    </label>
                    <input
                      type="text"
                      value={form.dbHost}
                      onChange={(e) => update("dbHost", e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Port
                    </label>
                    <input
                      type="text"
                      value={form.dbPort}
                      onChange={(e) => update("dbPort", e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Database Name
                  </label>
                  <input
                    type="text"
                    value={form.dbName}
                    onChange={(e) => update("dbName", e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    MySQL Username
                  </label>
                  <input
                    type="text"
                    value={form.dbUser}
                    onChange={(e) => update("dbUser", e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    MySQL Password
                  </label>
                  <input
                    type="password"
                    value={form.dbPassword}
                    onChange={(e) => update("dbPassword", e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Enter your database password (required if set)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Must match the password for the MySQL user above
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setError(""); setStep(1); }}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!form.dbHost || !form.dbUser || !form.dbName) {
                        setError("Please fill in all required fields");
                        return;
                      }
                      setError("");
                      setStep(3);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: AI & App settings */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white mb-4">
                  AI & Application Settings
                </h2>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    OpenAI API Key
                  </label>
                  <input
                    type="password"
                    value={form.openaiApiKey}
                    onChange={(e) => update("openaiApiKey", e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    placeholder="sk-..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Can be added or changed later in admin settings
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Application URL
                  </label>
                  <input
                    type="url"
                    value={form.appUrl}
                    onChange={(e) => update("appUrl", e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    placeholder="https://yourdomain.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used for generating interview links
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
                    onClick={() => { setError(""); setStep(2); }}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    {loading ? "Setting up..." : "Complete Setup"}
                  </button>
                </div>
              </div>
            )}

            {/* Error display for steps 1 & 2 */}
            {error && step < 3 && (
              <div className="mt-4 bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
