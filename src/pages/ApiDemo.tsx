import React, { useState, useRef } from 'react';
import { Search, Loader2, CheckCircle2, AlertCircle, Terminal, Clipboard } from 'lucide-react';

export default function ApiDemo() {
  const [rollNumber, setRollNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('vk_ukSRk4jF0mIWvBoFj5iJ6PkFayBVsK7q');
  
  const baseUrl = `${window.location.origin}/api/v1/results/`;

  const handleFetch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rollNumber.trim()) {
      setError('Roll number is required.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(baseUrl + encodeURIComponent(rollNumber.trim()), {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        let errorDetail = `HTTP ${response.status} — ${response.statusText}`;
        try {
          const errorJson = await response.json();
          errorDetail = errorJson.message || errorJson.error || errorDetail;
        } catch (e) {}
        throw new Error(errorDetail);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch result.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 transition-all duration-300">
          {/* Header */}
          <div className="bg-[#0f2b3d] p-6 sm:p-8 text-white">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <span className="text-3xl">📋</span>
              Result Checker
            </h1>
            <p className="mt-2 text-sm text-gray-300 opacity-90 font-medium">
              🔐 Secure access • Institutional results portal
            </p>
          </div>

          <div className="p-8 sm:p-10">
            {/* API Key Input (for demo purposes) */}
            <div className="mb-6">
              <label className="block text-[0.7rem] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
                🔑 ACTIVE API KEY (DEMO)
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key..."
                className="w-full px-5 py-3 border-2 border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50 dark:bg-gray-800/50 focus:border-primary-500 focus:ring-0 transition-all font-mono text-sm dark:text-white"
              />
            </div>

            {/* Roll Number Input */}
            <form onSubmit={handleFetch} className="mb-8">
              <label className="block text-[0.7rem] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
                📌 ROLL NUMBER
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 2201CS01"
                  className="w-full px-5 py-4 border-2 border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-800 focus:border-primary-500 focus:ring-0 transition-all text-lg font-semibold dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-[#0f2b3d] hover:bg-[#1a3d54] text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
                {loading ? 'Searching...' : 'Fetch Result'}
              </button>
            </form>

            {/* Results Area */}
            {result && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500 rounded-2xl p-6 mb-6">
                  <div className="flex items-center gap-2 mb-4 text-green-700 dark:text-green-400 font-bold">
                    <CheckCircle2 className="h-5 w-5" />
                    Result Retrieved
                  </div>
                  
                  <div className="space-y-3 bg-white/50 dark:bg-gray-800/50 rounded-xl p-4 mb-4 border border-green-100 dark:border-green-900/20">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">🎓 Roll Number</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{result.rollNumber}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">📛 Student Name</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{result.studentName}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">📊 Percentage</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{result.percentage}%</span>
                    </div>
                  </div>

                  <details className="group">
                    <summary className="cursor-pointer text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 list-none flex items-center gap-1">
                      <Terminal className="h-3 w-3" />
                      VIEW JSON RESPONSE
                    </summary>
                    <pre className="mt-3 bg-gray-900 text-green-400 p-4 rounded-xl text-[0.7rem] font-mono overflow-x-auto shadow-inner">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 rounded-2xl p-6 animate-in fade-in shake duration-300">
                <div className="flex items-center gap-2 mb-2 text-red-700 dark:text-red-400 font-bold">
                  <AlertCircle className="h-5 w-5" />
                  Request Failed
                </div>
                <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
                <p className="mt-4 text-[0.7rem] text-red-400 font-medium italic">
                  💡 Tip: Ensure your API key is active and the roll number exists.
                </p>
              </div>
            )}

            {/* Footer Badge */}
            <div className="flex justify-center mt-8">
              <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-4 py-2 rounded-full text-[0.65rem] font-bold tracking-widest uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                X-API-Key Active • Live Production Data
              </span>
            </div>
          </div>
        </div>

        {/* External Code Suggestion */}
        <div className="mt-10 bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-lg">
           <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Terminal className="h-4 w-4" /> Endpoint used in this demo
           </h3>
           <div className="bg-gray-50 dark:bg-black/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
              <code className="text-xs text-primary-600 dark:text-primary-400 break-all font-mono">
                GET {baseUrl}{rollNumber || ':rollNumber'}
              </code>
           </div>
        </div>
      </div>
    </div>
  );
}
