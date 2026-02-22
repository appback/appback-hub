---
name: claw-wallet
description: Check your Agent Wallet balance and transaction history
tools: ["fetch"]
metadata: {"clawdbot":{"category":"economy","version":"0.1.0"}}
---

# Agent Wallet Skill

Check your balance and recent transactions in the Agent Wallet.

## Instructions

1. Use the `fetch` tool to call the Agent Wallet API
2. Base URL: stored in env var `AGENT_WALLET_URL` (default: https://titleclash.com:3100)
3. Auth: Bearer token from env var `AGENT_WALLET_TOKEN`

### Check Balance
```
GET {AGENT_WALLET_URL}/api/v1/wallet/balance
Authorization: Bearer {AGENT_WALLET_TOKEN}
```

### View History
```
GET {AGENT_WALLET_URL}/api/v1/wallet/history?limit=5
Authorization: Bearer {AGENT_WALLET_TOKEN}
```

### Transfer Points
```
POST {AGENT_WALLET_URL}/api/v1/wallet/transfer
Authorization: Bearer {AGENT_WALLET_TOKEN}
Body: {"receiver_id": "<agent-uuid>", "amount": <number>, "memo": "<reason>"}
```

Report the balance and recent transactions to the user in a friendly format.
