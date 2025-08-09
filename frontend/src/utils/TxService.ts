import { ethers, type TransactionReceipt, type TransactionRequest, type TransactionResponse } from "ethers";

export class WalletService {
  private wallet: ethers.Wallet;
  private provider: ethers.JsonRpcProvider;
  private nonceManager: { markMined: (nonce: number) => void };

  constructor(privateKey: string, rpcUrl: string, nonceManager: { markMined: (nonce: number) => void }) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.nonceManager = nonceManager;
  }

  async sendTransaction(to: string, valueEth: string) {
    const maxPriorityFeePerGas = ethers.parseUnits("2", "gwei");
    const maxFeePerGas = ethers.parseUnits("50", "gwei");

    const txRequest: TransactionRequest = {
      to,
      value: ethers.parseEther(valueEth),
      maxPriorityFeePerGas,
      maxFeePerGas,
      gasLimit: 21000n,
      type: 2
    };

    const txResponse: TransactionResponse = await this.wallet.sendTransaction(txRequest);
    await this.monitorTx(txResponse.hash);
    return txResponse.hash;
  }

  private async monitorTx(txHash: string) {
    const receipt: TransactionReceipt | null = await this.provider.getTransactionReceipt(txHash);
    if (!receipt) return;
    const tx = await this.provider.getTransaction(receipt.hash);
    if (tx) this.nonceManager.markMined(tx.nonce);
  }
}

  
