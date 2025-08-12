import React, { useEffect, useState } from "react";

interface Token { id: string; name: string; symbol: string; image: string; current_price: number; market_cap: number; total_volume: number; price_change_percentage_24h: number; }

const ExplorePage: React.FC = () => {
  const [tokens, setTokens] = useState<Token[]>([]); const [page, setPage] = useState(1); const apiKey = import.meta.env.VITE_COINGECKO_API_KEY;
  useEffect(() => { (async () => { try { const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=30&page=${page}&sparkline=false&x_cg_demo_api_key=${apiKey}`); const data = await res.json(); if (Array.isArray(data)) setTokens(data); } catch { setTokens([]); } })(); }, [page, apiKey]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Explore Tokens</h1>
      <table className="w-full">
        <thead>
          <tr className="bg-gray-800">
            <th className="p-2 text-left">#</th>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Price</th>
            <th className="p-2 text-left">24h Change</th>
            <th className="p-2 text-left">Market Cap</th>
            <th className="p-2 text-left">Volume</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((t, i) => (
            <tr key={t.id} className="border-b border-gray-700 h-20">
              <td className="p-2">{(page - 1) * 30 + i + 1}</td>
              <td className="p-2"><div className="flex items-center gap-2 h-full"><img src={t.image} alt={t.name} className="w-6 h-6" /><span className="text-lg font-bold">{t.name}</span></div></td>
              <td className="p-2">${t.current_price.toLocaleString()}</td>
              <td className={`p-2 ${t.price_change_percentage_24h >= 0 ? "text-green-500" : "text-red-500"}`}>{t.price_change_percentage_24h.toFixed(2)}%</td>
              <td className="p-2">${t.market_cap.toLocaleString()}</td>
              <td className="p-2">${t.total_volume.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-between mt-4">
        <button className="bg-gray-800 px-4 py-2 rounded disabled:opacity-50" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>Prev</button>
        <span className="px-4">Page {page}</span>
        <button className="bg-gray-800 px-4 py-2 rounded" onClick={() => setPage(p => p + 1)}>Next</button>
      </div>
    </div>
  );
};

export default ExplorePage;





