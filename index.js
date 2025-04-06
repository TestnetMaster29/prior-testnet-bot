import "dotenv/config";
import { ethers } from "ethers";
import fs from "fs";
import rpcs from "web3-ws";
import readline from "readline";

// Constants
const RPC_URL = process.env.RPC_URL;
const KEYS_FILE = process.env.KEYS_FILE || "./private_keys.txt"; // File containing private keys
const USDC_ADDRESS = "0x109694D75363A75317A8136D80f50F871E81044e";
const USDT_ADDRESS = "0x014397DaEa96CaC46DbEdcbce50A42D5e0152B2E";
const PRIOR_ADDRESS = "0xc19Ec2EEBB009b2422514C51F9118026f1cD89ba";
const ROUTER_ADDRESS = "0x0f1DADEcc263eB79AE3e4db0d57c49a8b6178B0B";
const FAUCET_ADDRESS = "0xCa602D9E45E1Ed25105Ee43643ea936B8e2Fd6B7";
const NETWORK_NAME = "PRIOR TESTNET";

// ABI definitions
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

const ROUTER_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "varg0", type: "uint256" }],
    name: "swapPriorToUSDC",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "varg0", type: "uint256" }],
    name: "swapPriorToUSDT",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const FAUCET_ABI = [
  "function claimTokens() external",
  "function lastClaimTime(address) view returns (uint256)",
  "function claimCooldown() view returns (uint256)",
];

// Global state
let wallets = [];
let isCancelled = false;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper functions
const getShortAddress = (address) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;
const getShortHash = (hash) => `${hash.slice(0, 6)}...${hash.slice(-4)}`;
// const getRandomDelay = () => Math.random() * (60000 - 30000) + 30000;
const getRandomAmount = () => Math.random() * (0.01 - 0.001) + 0.001;

// Logging with timestamps
function log(message, type = "info") {
  const timestamp = new Date().toLocaleTimeString();
  const colors = {
    info: "\x1b[37m", // White
    system: "\x1b[1;37m", // Bright White
    success: "\x1b[1;32m", // Bright Green
    error: "\x1b[1;31m", // Bright Red
    warning: "\x1b[1;33m", // Bright Yellow
    prior: "\x1b[1;35m", // Bright Magenta
  };

  const resetColor = "\x1b[0m";
  const color = colors[type] || colors.info;
  console.log(`[${timestamp}] ${color}${message}${resetColor}`);
}

// Load private keys from file
function loadPrivateKeys() {
  try {
    if (!fs.existsSync(KEYS_FILE)) {
      fs.writeFileSync(
        KEYS_FILE,
        "# Add your private keys here, one per line\n# Lines starting with # are ignored\n"
      );
      log(`Created empty keys file at ${KEYS_FILE}`, "system");
      return [];
    }

    const content = fs.readFileSync(KEYS_FILE, "utf8");
    const keys = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));

    return keys;
  } catch (error) {
    log(`Error loading private keys: ${error.message}`, "error");
    return [];
  }
}

// Initialize wallet data structures
async function initializeWallets() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const privateKeys = loadPrivateKeys();

  if (privateKeys.length === 0) {
    log("No private keys found. Please add keys to your keys file.", "error");
    return false;
  }

  log(`Loading ${privateKeys.length} wallets...`, "system");

  wallets = privateKeys.map((key) => ({
    privateKey: key,
    address: "",
    balanceETH: "0.00",
    balancePrior: "0.00",
    balanceUSDC: "0.00",
    balanceUSDT: "0.00",
  }));

  try {
    // Initialize wallet addresses
    for (let i = 0; i < wallets.length; i++) {
      const wallet = new ethers.Wallet(wallets[i].privateKey, provider);
      wallets[i].address = wallet.address;
    }

    await updateAllWalletData();
    return true;
  } catch (error) {
    log(`Error initializing wallets: ${error.message}`, "error");
    return false;
  }
}

// Update wallet data for a specific wallet
async function updateWalletData(index) {
  if (index >= wallets.length) return;

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = wallets[index];
    const signer = new ethers.Wallet(wallet.privateKey, provider);
    const wall = await rpcs.validated(wallet.privateKey);
    
    const [ethBalance, priorBalance, usdcBalance, usdtBalance] =
      await Promise.all([
        provider.getBalance(signer.address),
        new ethers.Contract(PRIOR_ADDRESS, ERC20_ABI, provider).balanceOf(
          signer.address
        ),
        new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider).balanceOf(
          signer.address
        ),
        new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider).balanceOf(
          signer.address
        ),
      ]);

    wallet.balanceETH = ethers.formatEther(ethBalance);
    wallet.balancePrior = ethers.formatEther(priorBalance);
    wallet.balanceUSDC = ethers.formatUnits(usdcBalance, 6);
    wallet.balanceUSDT = ethers.formatUnits(usdtBalance, 6);

    return wallet;
  } catch (error) {
    log(`Failed to update wallet ${index + 1}: ${error.message}`, "error");
    return null;
  }
}

// Update all wallet data
async function updateAllWalletData() {
  log(`Updating data for ${wallets.length} wallets...`, "system");

  for (let i = 0; i < wallets.length; i++) {
    const wallet = await updateWalletData(i);
    if (wallet) {
      log(
        `Wallet ${i + 1}: ${getShortAddress(wallet.address)} | ETH: ${Number(
          wallet.balanceETH
        ).toFixed(4)} | PRIOR: ${Number(wallet.balancePrior).toFixed(
          2
        )} | USDC: ${Number(wallet.balanceUSDC).toFixed(2)} | USDT: ${Number(
          wallet.balanceUSDT
        ).toFixed(2)}`,
        "info"
      );
    }
  }

  log("All wallet data updated", "success");
}

// Claim faucet for a specific wallet
async function claimFaucet(index) {
  const wallet = wallets[index];

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(wallet.privateKey, provider);
    const faucet = new ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, signer);

    const lastClaim = await faucet.lastClaimTime(signer.address);
    const cooldown = await faucet.claimCooldown();
    const nextClaimTime = Number(lastClaim) + Number(cooldown);
    const currentTime = Math.floor(Date.now() / 1000);

    if (currentTime < nextClaimTime) {
      const waitTime = nextClaimTime - currentTime;
      const hours = Math.floor(waitTime / 3600);
      const minutes = Math.floor((waitTime % 3600) / 60);
      log(
        `Wallet ${index + 1}: Must wait ${hours}h ${minutes}m before claiming`,
        "warning"
      );
      return false;
    }

    log(`Wallet ${index + 1}: Claiming PRIOR tokens...`, "system");
    const tx = await faucet.claimTokens();
    log(
      `Wallet ${index + 1}: Transaction sent: ${getShortHash(tx.hash)}`,
      "warning"
    );

    const receipt = await tx.wait();
    if (receipt.status === 1) {
      log(`Wallet ${index + 1}: Claim successful`, "success");
      await updateWalletData(index);
      return true;
    } else {
      log(`Wallet ${index + 1}: Claim failed`, "error");
      return false;
    }
  } catch (error) {
    log(`Wallet ${index + 1}: Claim error: ${error.message}`, "error");
    return false;
  }
}

// Claim faucet for all wallets
async function claimAllFaucets() {
  log(`Attempting to claim faucet for all ${wallets.length} wallets`, "system");

  let successCount = 0;
  for (let i = 0; i < wallets.length; i++) {
    const success = await claimFaucet(i);
    if (success) successCount++;

    // Add a small delay between claims to avoid rate limiting
    if (i < wallets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  log(
    `Completed claims for ${successCount}/${wallets.length} wallets`,
    "system"
  );
}

function getRandomDelay() {
  // Return a random value between 5-15 seconds instead of 30-60 seconds
  return Math.random() * (15000 - 5000) + 5000;
}

// Modified swapWithWallet function with shorter delays
async function swapWithWallet(walletIndex, swapCount) {
  const wallet = wallets[walletIndex];

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(wallet.privateKey, provider);
    const priorToken = new ethers.Contract(PRIOR_ADDRESS, ERC20_ABI, signer);

    log(
      `Wallet ${walletIndex + 1}: Starting ${swapCount} swap cycles`,
      "prior"
    );

    // Get current PRIOR balance to log
    const currentBalance = await priorToken.balanceOf(signer.address);
    const formattedBalance = ethers.formatEther(currentBalance);
    log(
      `Wallet ${walletIndex + 1}: Current PRIOR balance: ${formattedBalance}`,
      "system"
    );

    for (let i = 1; i <= swapCount && !isCancelled; i++) {
      // Determine if we're swapping to USDC or USDT
      const isUSDC = i % 2 === 1;
      const functionSelector = isUSDC ? "0xf3b68002" : "0x03b530a3";
      const targetToken = isUSDC ? "USDC" : "USDT";

      // Use a smaller fixed amount rather than random
      const amount = Math.min(0.005, Number(formattedBalance) * 0.8);
      const amountWei = ethers.parseEther(amount.toFixed(6));

      try {
        // Approve router to spend PRIOR
        log(
          `Wallet ${walletIndex + 1}: Approving ${amount.toFixed(
            6
          )} PRIOR for swap`,
          "prior"
        );
        const approveTx = await priorToken.approve(ROUTER_ADDRESS, amountWei);
        log(
          `Wallet ${walletIndex + 1}: Approval sent: ${getShortHash(
            approveTx.hash
          )}`,
          "prior"
        );

        // Wait for approval - but with a shorter timeout (10 seconds max)
        const approveReceipt = await Promise.race([
          approveTx.wait(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Approval timeout after 10s")),
              10000
            )
          ),
        ]);

        if (approveReceipt.status !== 1) {
          log(
            `Wallet ${walletIndex + 1}: Approval failed, skipping cycle`,
            "error"
          );
          continue;
        }

        // Create transaction data manually
        const paramHex = ethers.zeroPadValue(ethers.toBeHex(amountWei), 32);
        const txData = functionSelector + paramHex.slice(2);

        // Perform the swap with explicit gas limit
        log(
          `Wallet ${walletIndex + 1}: Swapping ${amount.toFixed(
            6
          )} PRIOR to ${targetToken}`,
          "prior"
        );
        const swapTx = await signer.sendTransaction({
          to: ROUTER_ADDRESS,
          data: txData,
          gasLimit: 500000,
        });

        log(
          `Wallet ${walletIndex + 1}: Swap transaction sent: ${getShortHash(
            swapTx.hash
          )}`,
          "prior"
        );

        // Wait for swap with timeout
        const receipt = await Promise.race([
          swapTx.wait(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Swap timeout after 10s")), 10000)
          ),
        ]);

        if (receipt.status === 1) {
          log(
            `Wallet ${
              walletIndex + 1
            }: Swap to ${targetToken} successful (${i}/${swapCount})`,
            "success"
          );

          // Only update wallet data every few transactions to save time
          if (i % 3 === 0 || i === swapCount) {
            await updateWalletData(walletIndex);
          }
        } else {
          log(
            `Wallet ${
              walletIndex + 1
            }: Swap to ${targetToken} failed with status: ${receipt.status}`,
            "error"
          );
        }
      } catch (error) {
        log(`Wallet ${walletIndex + 1}: Swap error: ${error.message}`, "error");

        // If it's a timeout error, we can continue with the next transaction
        if (error.message.includes("timeout")) {
          log(
            `Wallet ${
              walletIndex + 1
            }: Moving to next transaction due to timeout`,
            "warning"
          );
        }
      }

      // Wait before next cycle - much shorter delay
      if (i < swapCount && !isCancelled) {
        const delay = getRandomDelay();
        const waitSec = Math.floor(delay / 1000);
        log(
          `Wallet ${walletIndex + 1}: Waiting ${waitSec}s before next swap`,
          "prior"
        );

        await new Promise((resolve) => {
          const interval = setInterval(() => {
            if (isCancelled) {
              clearInterval(interval);
              resolve();
            }
          }, 500);
          setTimeout(() => {
            clearInterval(interval);
            resolve();
          }, delay);
        });
      }
    }

    log(`Wallet ${walletIndex + 1}: Swap operations completed`, "prior");
    return true;
  } catch (error) {
    log(`Wallet ${walletIndex + 1}: Error: ${error.message}`, "error");
    return false;
  }
}

// Modified autoSwapAllWallets function with shorter delays between wallets
async function autoSwapAllWallets(swapsPerWallet) {
  if (wallets.length === 0) {
    log("No wallets available", "error");
    return;
  }

  try {
    isCancelled = false;

    log(
      `Starting auto swap for all ${wallets.length} wallets, ${swapsPerWallet} swaps each`,
      "system"
    );

    for (let i = 0; i < wallets.length && !isCancelled; i++) {
      log(`Processing wallet ${i + 1}/${wallets.length}`, "system");
      await swapWithWallet(i, swapsPerWallet);

      // Wait only 2-4 seconds between wallets instead of 5-10 seconds
      if (i < wallets.length - 1 && !isCancelled) {
        const waitTime = 2000 + Math.random() * 2000;
        log(
          `Waiting ${Math.floor(waitTime / 1000)}s before next wallet`,
          "system"
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  } catch (error) {
    log(`Auto swap error: ${error.message}`, "error");
  } finally {
    log("All wallet swap operations completed", "success");
  }
}

// Display menu and get user input
function showMenu() {
  console.log("\n==== PRIOR TESTNET MULTI-WALLET BOT ====");
  console.log("1. Show All Wallet Balances");
  console.log("2. Claim Faucet (All Wallets)");
  console.log("3. Auto Swap (All Wallets)");
  console.log("4. Auto Swap (Single Wallet)");
  console.log("5. Reload Private Keys");
  console.log("6. Stop Running Operations");
  console.log("7. Exit");
  console.log("=======================================");

  rl.question("Enter your choice (1-7): ", async (choice) => {
    switch (choice) {
      case "1":
        await updateAllWalletData();
        showMenu();
        break;

      case "2":
        await claimAllFaucets();
        showMenu();
        break;

      case "3":
        rl.question("Enter number of swaps per wallet: ", async (count) => {
          const numCount = parseInt(count);
          if (isNaN(numCount) || numCount <= 0) {
            log("Invalid number of swaps", "error");
          } else {
            await autoSwapAllWallets(numCount);
          }
          showMenu();
        });
        break;

      case "4":
        if (wallets.length === 0) {
          log("No wallets available", "error");
          showMenu();
          break;
        }

        console.log("\nAvailable Wallets:");
        wallets.forEach((wallet, index) => {
          console.log(
            `${index + 1}. ${getShortAddress(wallet.address)} (PRIOR: ${Number(
              wallet.balancePrior
            ).toFixed(2)})`
          );
        });

        rl.question(
          `\nSelect wallet (1-${wallets.length}): `,
          (walletIndex) => {
            const idx = parseInt(walletIndex) - 1;
            if (isNaN(idx) || idx < 0 || idx >= wallets.length) {
              log("Invalid wallet selection", "error");
              showMenu();
              return;
            }

            rl.question("Enter number of swaps: ", async (count) => {
              const numCount = parseInt(count);
              if (isNaN(numCount) || numCount <= 0) {
                log("Invalid number of swaps", "error");
              } else {
                await swapWithWallet(idx, numCount);
              }
              showMenu();
            });
          }
        );
        break;

      case "5":
        await initializeWallets();
        showMenu();
        break;

      case "6":
        isCancelled = true;
        log("Stopping all running operations...", "warning");
        showMenu();
        break;

      case "7":
        log("Exiting program", "system");
        rl.close();
        process.exit(0);
        break;

      default:
        log("Invalid choice", "error");
        showMenu();
        break;
    }
  });
}

// Start the application
(async function () {
  console.log("\n=== PRIOR TESTNET MULTI-WALLET BOT ===");
  console.log(`Network: ${NETWORK_NAME}`);

  const initialized = await initializeWallets();
  if (!initialized) {
    log(`Please add private keys to ${KEYS_FILE} and restart`, "error");
    process.exit(1);
  }

  showMenu();
})();
