function Home() {
  return (
    <div className="max-w-xl mx-auto mt-12 p-8 bg-zinc-900 rounded-xl shadow-lg flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6 text-zinc-100">Account Balances</h1>
      <div className="w-full flex flex-col gap-4 mb-8">
        
      </div>
      <div className="flex gap-6">
        <button className="bg-blue-700 hover:bg-blue-800 text-zinc-100 px-6 py-2 rounded font-semibold ">Send Crypto</button>
        <button className="bg-green-700 hover:bg-green-800 text-zinc-100 px-6 py-2 rounded font-semibold">Receive Crypto</button>
      </div>
    </div>
  )
}

export default Home 