[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)


# Crypt7 Wallet – MVP  

Crypt7 is a **non-custodial Ethereum wallet MVP** that allows users to create wallets, manage tokens, and performs transactions — all in a simple, secure, and developer-friendly way.  

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
- **Backend:** Rust (for key management)  

---

## Project Architecture  

```mermaid
flowchart TD
    A["User Interface (React + TS)"] -->|"Generates Wallet / Sends TX"| B["Ethers.js"]
    B -->|"Signs TX Locally"| C["Private Key Management (Rust - Super Secure)"]
    B -->|"Sends Signed TX"| D["Ethereum Network – Sepolia"]
    D -->|"Updates Balances"| A
```
## License

This project is licensed under the MIT License.  










