const fs = require('fs');
const path = require('path');

/**
 * sync-env.js
 * Automatically extracts deployed contract addresses from Forge broadcast logs
 * and updates the web app's .env.local file.
 */

const BROADCAST_PATH = path.join(__dirname, '../broadcast/Deploy.s.sol/31337/run-latest.json'); // Default to Anvil chainId
const ENV_PATH = path.join(__dirname, '../../apps/web/.env.local');

function sync() {
    if (!fs.existsSync(BROADCAST_PATH)) {
        console.error(`❌ Broadcast log not found at ${BROADCAST_PATH}`);
        console.log('Ensure you have run: forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast');
        return;
    }

    const log = JSON.parse(fs.readFileSync(BROADCAST_PATH, 'utf8'));
    const transactions = log.transactions || [];

    const addresses = {};

    transactions.forEach(tx => {
        if (tx.transactionType === 'CREATE' && tx.contractName) {
            addresses[tx.contractName] = tx.contractAddress;
        }
    });

    const mapping = {
        'FundFlow': 'NEXT_PUBLIC_FUND_FLOW_ADDRESS',
        'SchemeRegistry': 'NEXT_PUBLIC_SCHEME_REGISTRY_ADDRESS',
        'AnomalyOracle': 'NEXT_PUBLIC_ANOMALY_ORACLE_ADDRESS',
        'Anchor': 'NEXT_PUBLIC_ANCHOR_ADDRESS',
        'GrievancePortal': 'NEXT_PUBLIC_GRIEVANCE_PORTAL_ADDRESS',
    };

    let envContent = '';
    if (fs.existsSync(ENV_PATH)) {
        envContent = fs.readFileSync(ENV_PATH, 'utf8');
    }

    console.log('\n🚀 Syncing addresses to .env.local...');

    Object.entries(mapping).forEach(([contractName, envKey]) => {
        const addr = addresses[contractName];
        if (addr) {
            console.log(`   ✅ ${contractName} -> ${addr}`);
            const regex = new RegExp(`^${envKey}=.*`, 'm');
            if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `${envKey}=${addr}`);
            } else {
                envContent += `\n${envKey}=${addr}`;
            }
        } else {
            console.warn(`   ⚠️  Warning: ${contractName} not found in broadcast logs.`);
        }
    });

    // Ensure RPC URL is set
    if (!envContent.includes('NEXT_PUBLIC_RPC_URL')) {
        envContent += `\nNEXT_PUBLIC_RPC_URL=http://localhost:8545`;
    }

    fs.writeFileSync(ENV_PATH, envContent.trim() + '\n');
    console.log('\n✨ apps/web/.env.local has been updated successfully!\n');
}

sync();
