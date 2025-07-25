const trendingCoins = [
  { name: 'Bitcoin', symbol: 'BTC', price: '$0.0' },
  { name: 'Ethereum', symbol: 'ETH', price: '$0.0' },
  { name: 'Solana', symbol: 'SOL', price: '$0.0' },
  { name: 'Polygon', symbol: 'MATIC', price: '$0.0' },
]

function Explore() {
  return (
    <div className="max-w-xl mx-auto mt-12 p-8 bg-zinc-900 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-zinc-100">Explore</h1>
      <input
        type="text"
        placeholder="Search coins..."
        className="w-full mb-6 px-4 py-2 border border-zinc-700 bg-zinc-800 text-zinc-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-700"
      />
      <div className="flex flex-col gap-4">
        {trendingCoins.map((coin) => (
          <div key={coin.symbol} className="flex justify-between items-center bg-zinc-800 p-4 rounded">
            <span className="font-medium text-zinc-300">{coin.name} ({coin.symbol})</span>
            <span className="font-mono text-lg text-zinc-100">{coin.price}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Explore 