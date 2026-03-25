import React, { useEffect, useState, useCallback } from "react";

interface Token {
  id: string;
  name: string;
  symbol: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
}

interface ApiError {
  error?: string;
  status?: { error_code?: number; error_message?: string };
}

const ExplorePage: React.FC = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_COINGECKO_API_KEY;

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=30&page=${page}&sparkline=false${apiKey ? `&x_cg_demo_api_key=${apiKey}` : ''}`;

      const res = await fetch(url);

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("Rate limit exceeded. Please wait a moment and try again.");
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error("API key error. Please check your CoinGecko API key.");
        }
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      // Check for API error response
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const apiError = data as ApiError;
        if (apiError.error || apiError.status?.error_message) {
          throw new Error(apiError.error || apiError.status?.error_message || "Unknown API error");
        }
      }

      if (!Array.isArray(data)) {
        throw new Error("Unexpected response format from API");
      }

      setTokens(data);

    } catch (err) {
      console.error("Error fetching tokens:", err);

      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError("Network error. Please check your internet connection.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load token data. Please try again.");
      }

      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [page, apiKey]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const formatPrice = (price: number): string => {
    if (price === undefined || price === null || isNaN(price)) return "—";
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatLargeNumber = (num: number): string => {
    if (num === undefined || num === null || isNaN(num)) return "—";
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  const formatChange = (change: number): string => {
    if (change === undefined || change === null || isNaN(change)) return "—";
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Explore Tokens</h1>
        <button
          onClick={fetchTokens}
          disabled={loading}
          className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
          <button
            onClick={fetchTokens}
            className="text-sm text-red-300 hover:text-red-200 mt-2 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && tokens.length === 0 && (
        <div className="flex justify-center items-center py-20">
          <div className="text-zinc-400">Loading market data...</div>
        </div>
      )}

      {/* Token table */}
      {tokens.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800 text-zinc-400 text-sm">
                <th className="p-3 text-left w-12">#</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-right">Price</th>
                <th className="p-3 text-right">24h Change</th>
                <th className="p-3 text-right">Market Cap</th>
                <th className="p-3 text-right">Volume (24h)</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t, i) => (
                <tr
                  key={t.id}
                  className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="p-3 text-zinc-400">{(page - 1) * 30 + i + 1}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={t.image}
                        alt={t.name}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div>
                        <div className="font-semibold">{t.name}</div>
                        <div className="text-xs text-zinc-400 uppercase">{t.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono">
                    {formatPrice(t.current_price)}
                  </td>
                  <td className={`p-3 text-right font-mono ${
                    t.price_change_percentage_24h >= 0 ? "text-green-500" : "text-red-500"
                  }`}>
                    {formatChange(t.price_change_percentage_24h)}
                  </td>
                  <td className="p-3 text-right text-zinc-300">
                    {formatLargeNumber(t.market_cap)}
                  </td>
                  <td className="p-3 text-right text-zinc-300">
                    {formatLargeNumber(t.total_volume)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && tokens.length === 0 && (
        <div className="text-center py-20 text-zinc-400">
          No token data available. Please try again later.
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <button
          className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page === 1 || loading}
        >
          ← Previous
        </button>
        <span className="text-zinc-400">Page {page}</span>
        <button
          className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded transition-colors disabled:opacity-50"
          onClick={() => setPage((p) => p + 1)}
          disabled={loading || tokens.length < 30}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default ExplorePage;
