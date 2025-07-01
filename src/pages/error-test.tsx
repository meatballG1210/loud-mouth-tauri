import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Link } from "wouter";

interface ErrorResponse {
  message: string;
  code: string;
  details?: string;
}

export default function ErrorTest() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setResults((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ]);
  };

  const testNotFoundError = async () => {
    try {
      setLoading(true);
      await invoke("test_error_not_found");
      addResult("❌ Expected error but got success");
    } catch (error: any) {
      addResult(`✅ Not Found Error: ${JSON.stringify(error, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };

  const testValidationError = async () => {
    try {
      setLoading(true);
      await invoke("test_error_with_details");
      addResult("❌ Expected error but got success");
    } catch (error: any) {
      addResult(`✅ Validation Error: ${JSON.stringify(error, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };

  const testDatabaseError = async () => {
    try {
      setLoading(true);
      await invoke("test_database_error");
      addResult("❌ Expected error but got success");
    } catch (error: any) {
      addResult(`✅ Database Error: ${JSON.stringify(error, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };

  const testSuccessfulCall = async () => {
    try {
      setLoading(true);
      const count = await invoke<number>("get_user_count");
      addResult(`✅ Success: User count = ${count}`);
    } catch (error: any) {
      addResult(`❌ Unexpected error: ${JSON.stringify(error, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };

  const testDuplicateUser = async () => {
    try {
      setLoading(true);
      // Add user twice to trigger unique constraint
      const email = `test-${Date.now()}@example.com`;
      await invoke("add_test_user", { email });
      addResult(`✅ First user added: ${email}`);

      // Try to add same user again
      await invoke("add_test_user", { email });
      addResult("❌ Expected unique constraint error but got success");
    } catch (error: any) {
      addResult(
        `✅ Unique Constraint Error: ${JSON.stringify(error, null, 2)}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Error Handling Test Suite
            </h1>
            <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm">
              ← Back to Home
            </Link>
          </div>

          <p className="text-gray-600 mb-6">
            Test various error scenarios to verify the error handling framework
            is working correctly.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={testNotFoundError}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
            >
              Test Not Found
            </button>

            <button
              onClick={testValidationError}
              disabled={loading}
              className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
            >
              Test Validation Error
            </button>

            <button
              onClick={testDatabaseError}
              disabled={loading}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              Test DB Error
            </button>

            <button
              onClick={testDuplicateUser}
              disabled={loading}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
            >
              Test Duplicate User
            </button>

            <button
              onClick={testSuccessfulCall}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              Test Success
            </button>

            <button
              onClick={clearResults}
              disabled={loading}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
            >
              Clear Results
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Test Results</h2>

          {results.length === 0 ? (
            <p className="text-gray-500 italic">
              No tests run yet. Click a button above to start testing.
            </p>
          ) : (
            <div className="space-y-2">
              {results.map((result, index) => (
                <pre
                  key={index}
                  className="bg-gray-100 p-3 rounded text-sm whitespace-pre-wrap"
                >
                  {result}
                </pre>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
