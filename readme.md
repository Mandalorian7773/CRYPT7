# Crypt7 Wallet – MVP  

Crypt7 is a **non-custodial Ethereum wallet MVP** that allows users to create wallets, manage tokens, and perform transactions — all in a simple, secure, and developer-friendly way.  

---

## Features  
- **Ethereum Wallet Creation** – Generate new Ethereum wallets (private/public key pairs).  
- **Token Transactions** – Send and receive ERC-20 tokens easily.  
- **Non-Custodial** – Your private keys never leave your device.  
- **Minimal UI** – Focused on simplicity, perfect for testing and demos.  

---

## Tech Stack  
- **Frontend:** React + TypeScript  
- **Blockchain:** Ethereum (via Ethers.js)  
- **Backend (optional):** Rust (for key management)  

---

## Project Architecture  

```mermaid
flowchart TD
    A["User Interface (React + TS)"] -->|"Generates Wallet / Sends TX"| B["Ethers.js"]
    B -->|"Signs TX Locally"| C["Private Key Management RUST(Super secure)"]
    B -->|"Sends Signed TX"| D["Ethereum Network - Sepolia"]
    D -->|"Updates Balances"| A






