# Prior Swap Bot

A multi-wallet automation tool for swapping PRIOR tokens on the PRIOR testnet.

## Features

- Multi-wallet support (run operations across multiple wallets)
- Auto swap between PRIOR, USDC, and USDT tokens
- Claim tokens from the PRIOR faucet
- Optimized delays for efficient operations
- Simple command-line interface
- Customizable swap amounts and transaction counts

## Requirements

- Node.js 18 or higher
- Access to PRIOR testnet
- Private keys for one or more wallets

## Installation

1. Clone this repository:
```bash
git clone https://github.com/TestnetMaster29/prior-testnet-bot.git
cd prior-testnet-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create your environment file:
```bash
cp .env.example .env
```

4. Edit the `.env` file with your RPC URL:
```
RPC_URL=https://your-prior-testnet-rpc-url
```

5. Set up your wallet private keys:
```bash
cp private_keys.example.txt private_keys.txt
```

6. Edit `private_keys.txt` to add your private keys (one per line):
```
# Add your private keys here, one per line
# Lines starting with # are ignored
0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

## Usage

Start the bot:
```bash
npm start
```

### Menu Options

1. **Show All Wallet Balances** - Displays the balances of all loaded wallets
2. **Claim Faucet (All Wallets)** - Attempts to claim tokens from the faucet for all wallets
3. **Auto Swap (All Wallets)** - Performs swap operations on all loaded wallets
4. **Auto Swap (Single Wallet)** - Performs swap operations on a single selected wallet
5. **Reload Private Keys** - Reloads private keys from the keys file
6. **Stop Running Operations** - Stops any ongoing swap operations
7. **Exit** - Exits the application

## Configuration

You can modify these parameters in the code for custom behavior:

- `getRandomDelay()` - Controls the delay between transactions (5-15 seconds by default)
- `getRandomAmount()` - Controls the random amount for each swap (0.001-0.01 by default)

## Contract Addresses

- USDC: `0x109694D75363A75317A8136D80f50F871E81044e`
- USDT: `0x014397DaEa96CaC46DbEdcbce50A42D5e0152B2E`
- PRIOR: `0xc19Ec2EEBB009b2422514C51F9118026f1cD89ba`
- Router: `0x0f1DADEcc263eB79AE3e4db0d57c49a8b6178B0B`
- Faucet: `0xCa602D9E45E1Ed25105Ee43643ea936B8e2Fd6B7`

## Security

- Never share your `.env` or `private_keys.txt` files
- These files are excluded from git by default with `.gitignore`
- Use this tool at your own risk on testnets only

## License

MIT

Last updated: Sun Apr 27 03:14:48 UTC 2025
