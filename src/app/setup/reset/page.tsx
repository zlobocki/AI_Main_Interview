"use client";

import { useState } from "react";

export default function SetupResetPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  async function handleReset() {
    setStatus("loading");
    setErrors([]);
    setMessage("");

    try {
      const res = await fetch("/api/setup/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESET_SETUP" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Reset failed");
        return;
      }

      setStatus("success");
      setMessage(data.message || "Setup state cleared successfully.");
      if (data.errors?.length) {
        setErrors(data.errors);
      }
    } catch {
      setStatus("error");
      setMessage("Network error — could not reach the server.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Setup</h1>
          <p className="text-gray-600 text-sm">
            This will clear the setup completion state so the setup wizard runs
            again on next visit. All existing data (interviews, sessions, etc.)
            will be preserved in the database.
          </p>
        </div>

        {status === "idle" && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <strong>What this does:</strong>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Removes <code className="bg-amber-100 px-1 rounded">setup_complete</code> from the database</li>
                <li>Deletes <code className="bg-amber-100 px-1 rounded">.env.local</code> if it exists</li>
                <li>Clears the <code className="bg-amber-100 px-1 rounded">__setup_complete</code> browser cookie</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <strong>⚠️ If deployed on Railway:</strong> You must also remove the{" "}
              <code className="bg-blue-100 px-1 rounded">SETUP_COMPLETE</code> environment variable
              from your Railway project settings and redeploy for the reset to take full effect.
            </div>

            <button
              onClick={handleReset}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Reset Setup State
            </button>
          </div>
        )}

        {status === "loading" && (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-3" />
            Resetting…
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
              <strong>✅ Reset successful</strong>
              <p className="mt-1">{message}</p>
            </div>

            {errors.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <strong>Warnings:</strong>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <strong>Next steps:</strong>
              <ol className="mt-2 list-decimal list-inside space-y-1">
                <li>
                  If on Railway: remove <code className="bg-blue-100 px-1 rounded">SETUP_COMPLETE</code>{" "}
                  from environment variables and redeploy
                </li>
                <li>
                  Visit <a href="/setup" className="underline font-medium">/setup</a> to run the setup wizard again
                </li>
              </ol>
            </div>

            <a
              href="/setup"
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Go to Setup Wizard →
            </a>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              <strong>❌ Error</strong>
              <p className="mt-1">{message}</p>
            </div>
            <button
              onClick={() => setStatus("idle")}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
