"use client";

import { useState } from "react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [form, setForm] = useState({
    dbHost: "",
    dbPort: "3306",
    dbUser: "",
    dbPassword: "",
    dbName: "",
    username: "admin",
    newPassword: "",
    confirmPassword: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (form.newPassword !== form.confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match");
      return;
    }

    if (form.newPassword.length < 8) {
      setStatus("error");
      setMessage("Password must be at least 8 characters");
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dbHost: form.dbHost,
          dbPort: form.dbPort,
          dbUser: form.dbUser,
          dbPassword: form.dbPassword,
          dbName: form.dbName,
          username: form.username,
          newPassword: form.newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Reset failed");
      } else {
        setStatus("success");
        setMessage(data.message || "Password reset successfully!");
      }
    } catch {
      setStatus("error");
      setMessage("Network error — please try again");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Reset Admin Password</h1>
          <p className="text-gray-400 text-sm">
            Provide your database credentials to authenticate, then set a new admin password.
          </p>
        </div>

        {status === "success" ? (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center">
            <div className="text-green-400 text-5xl mb-4">✓</div>
            <p className="text-green-400 font-semibold mb-2">Password Reset!</p>
            <p className="text-gray-400 text-sm mb-6">{message}</p>
            <Link
              href="/admin/login"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="border-b border-gray-800 pb-4 mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Database Credentials</p>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">DB Host</label>
                    <input
                      type="text"
                      name="dbHost"
                      value={form.dbHost}
                      onChange={handleChange}
                      placeholder="localhost"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Port</label>
                    <input
                      type="text"
                      name="dbPort"
                      value={form.dbPort}
                      onChange={handleChange}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">DB User</label>
                    <input
                      type="text"
                      name="dbUser"
                      value={form.dbUser}
                      onChange={handleChange}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">DB Password</label>
                    <input
                      type="password"
                      name="dbPassword"
                      value={form.dbPassword}
                      onChange={handleChange}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Database Name</label>
                  <input
                    type="text"
                    name="dbName"
                    value={form.dbName}
                    onChange={handleChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">New Admin Credentials</p>
                <div className="mb-2">
                  <label className="block text-sm text-gray-400 mb-1">Admin Username</label>
                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-sm text-gray-400 mb-1">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={form.newPassword}
                    onChange={handleChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              {status === "error" && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-400 text-sm">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                {status === "loading" ? "Resetting..." : "Reset Password"}
              </button>

              <div className="text-center">
                <Link href="/admin/login" className="text-gray-500 hover:text-gray-400 text-sm transition-colors">
                  ← Back to Login
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
