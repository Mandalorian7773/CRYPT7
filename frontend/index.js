import init, { greet } from "./pkg/wallet_rs";

(async () => {
  // Initialize the WASM module
  await init();

  // Now you can call Rust functions
  console.log(greet("Aditya"));
})();
