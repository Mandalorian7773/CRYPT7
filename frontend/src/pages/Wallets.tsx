const wallets = [
  { },
  {  },
]

function Wallets() {




  return (
    <div className="max-w-xl mx-auto mt-12 p-8 bg-zinc-900 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-zinc-100">Wallets</h1>
      <div className="flex flex-col gap-4 mb-8">
        {wallets.map((wallet) => (
          <div key={wallet.address} className="flex flex-col bg-zinc-800 p-4 rounded">
            <span className="font-medium text-zinc-300">{wallet.name}</span>
            <span className="text-xs text-zinc-500">{wallet.address}</span>
            <span className="font-mono text-lg text-zinc-100 mt-1">{wallet.balance}</span>
          </div>
        ))}
      </div>
      <button className="bg-blue-700 hover:bg-blue-800 text-zinc-100 px-6 py-2 rounded font-semibold transition">Add Wallet</button>
    </div>
  )
}

export default Wallets 