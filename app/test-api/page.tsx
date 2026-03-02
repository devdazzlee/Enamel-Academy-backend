"use client";

import { useState } from "react";
import Link from "next/link";
import { API_PATHS } from "@/lib/api/endpoints";
import { authApi } from "@/lib/api/http";

export default function TestApiPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");

  const runTest = async () => {
    setIsLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await authApi.get(API_PATHS.testApi);
      setResult(res.data);
    } catch {
      setError("TESTApi request failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Test API</h1>
          <Link href="/settings" className="text-sm text-purple-600 hover:underline">
            Back to Settings
          </Link>
        </div>
        <p className="mb-4 text-sm text-gray-600">
          User-facing checker for <code>{API_PATHS.testApi}</code>.
        </p>
        <button
          onClick={runTest}
          disabled={isLoading}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {isLoading ? "Testing..." : "Run TESTApi"}
        </button>
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        {result && (
          <pre className="mt-4 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </main>
  );
}

