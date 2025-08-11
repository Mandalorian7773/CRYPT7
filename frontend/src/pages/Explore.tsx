import React, { useEffect, useState } from "react";

interface Token {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  image: string;
}

const ExplorePage: React.FC = () => {
  const [tokens, setTokens] = useState<Token[]>([]);

  useEffect(() => {
    fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,cardano,polkadot&order=market_cap_desc&per_page=10&page=1&sparkline=false"
    )
      .then((res) => res.json())
      .then((data) => setTokens(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Explore Tokens</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {tokens.map((token) => (
          <div
            key={token.id}
            className="bg-gray-800 text-white p-4 rounded-lg flex items-center space-x-4"
          >
            <img src={token.image} alt={token.name} className="w-10 h-10" />
            <div>
              <p className="font-semibold">{token.name}</p>
              <p className="text-sm uppercase">{token.symbol}</p>
              <p className="text-green-400">${token.current_price}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExplorePage;
