import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

// ─── ABIs ────────────────────────────────────────────────────────────────
const ANCHOR_ABI = [
    "event CheckpointCreated(uint256 indexed sequenceNumber, bytes32 indexed merkleRoot, uint256 disbursementCount, uint256 blockNumber, uint64 timestamp)",
    "function confirmAnchor(uint256 _sequenceNumber, string calldata _chain, bytes32 _txHash) external"
];

const POLYGON_MIRROR_ABI = [
    "function recordCheckpoint(uint256 sequenceNumber, bytes32 merkleRoot) external"
];

const SEPOLIA_MIRROR_ABI = [
    "function recordCheckpoint(uint256 sequenceNumber, bytes32 merkleRoot) external"
];

// ─── Configuration ───────────────────────────────────────────────────────
const POLYGON_CHECKPOINT_INTERVAL = 1;   // Post every checkpoint to Polygon Amoy
const SEPOLIA_CHECKPOINT_INTERVAL = 10;  // Post every 10th checkpoint to Sepolia

async function main() {
    console.log("╔══════════════════════════════════════════════════════╗");
    console.log("║   PRAMAANIK Dual Public Anchor Publisher v2.0       ║");
    console.log("║   Polygon Amoy (every checkpoint) + Sepolia (1/10) ║");
    console.log("╚══════════════════════════════════════════════════════╝");

    // ─── Validate environment ────────────────────────────────────────────
    const requiredEnvVars = ["BESU_RPC_URL", "POLYGON_AMOY_RPC_URL", "PRIVATE_KEY", "BESU_ANCHOR_ADDRESS"];
    for (const v of requiredEnvVars) {
        if (!process.env[v]) {
            console.error(`Missing required env var: ${v}`);
            process.exit(1);
        }
    }

    // ─── Providers ───────────────────────────────────────────────────────
    const besuProvider = new ethers.JsonRpcProvider(process.env.BESU_RPC_URL || "http://localhost:8545");
    const polygonProvider = new ethers.JsonRpcProvider(process.env.POLYGON_AMOY_RPC_URL);
    const sepoliaProvider = process.env.SEPOLIA_RPC_URL
        ? new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL)
        : null;

    // ─── Wallets ─────────────────────────────────────────────────────────
    const besuWallet = new ethers.Wallet(process.env.PRIVATE_KEY!, besuProvider);
    const polygonWallet = new ethers.Wallet(process.env.PRIVATE_KEY!, polygonProvider);
    const sepoliaWallet = sepoliaProvider
        ? new ethers.Wallet(process.env.PRIVATE_KEY!, sepoliaProvider)
        : null;

    // ─── Contracts ───────────────────────────────────────────────────────
    const anchorContractAddress = process.env.BESU_ANCHOR_ADDRESS!;
    const anchorReadOnly = new ethers.Contract(anchorContractAddress, ANCHOR_ABI, besuProvider);
    const anchorWritable = new ethers.Contract(anchorContractAddress, ANCHOR_ABI, besuWallet);

    const polygonMirrorAddress = process.env.POLYGON_MIRROR_ADDRESS;
    const sepoliaMirrorAddress = process.env.SEPOLIA_MIRROR_ADDRESS;

    console.log(`[Config] Besu Anchor:       ${anchorContractAddress}`);
    console.log(`[Config] Polygon Mirror:    ${polygonMirrorAddress || "not configured"}`);
    console.log(`[Config] Sepolia Mirror:    ${sepoliaMirrorAddress || "not configured"}`);
    console.log(`[Config] Publisher address:  ${besuWallet.address}`);
    console.log("");
    console.log("Listening for CheckpointCreated events on Besu...\n");

    // ─── Publish to Polygon Amoy ─────────────────────────────────────────
    async function publishToPolygon(sequenceNumber: bigint, merkleRoot: string): Promise<string | null> {
        if (!polygonMirrorAddress) {
            console.warn("[Polygon] Mirror contract address not configured — skipping");
            return null;
        }

        try {
            const mirror = new ethers.Contract(polygonMirrorAddress, POLYGON_MIRROR_ABI, polygonWallet);
            console.log(`[Polygon] Publishing checkpoint #${sequenceNumber} to Amoy...`);

            const tx = await mirror.recordCheckpoint(sequenceNumber, merkleRoot);
            console.log(`[Polygon] TX submitted: ${tx.hash}`);

            const receipt = await tx.wait();
            console.log(`[Polygon] ✓ Confirmed in block ${receipt.blockNumber} (gas: ${receipt.gasUsed})`);

            return tx.hash;
        } catch (error: any) {
            console.error(`[Polygon] ✗ Failed to publish:`, error.message || error);
            return null;
        }
    }

    // ─── Publish to Ethereum Sepolia ─────────────────────────────────────
    async function publishToSepolia(sequenceNumber: bigint, merkleRoot: string): Promise<string | null> {
        if (!sepoliaMirrorAddress || !sepoliaWallet) {
            console.warn("[Sepolia] Mirror contract or RPC not configured — skipping");
            return null;
        }

        try {
            const mirror = new ethers.Contract(sepoliaMirrorAddress, SEPOLIA_MIRROR_ABI, sepoliaWallet);
            console.log(`[Sepolia] Publishing checkpoint #${sequenceNumber} to Sepolia...`);

            const tx = await mirror.recordCheckpoint(sequenceNumber, merkleRoot);
            console.log(`[Sepolia] TX submitted: ${tx.hash}`);

            const receipt = await tx.wait();
            console.log(`[Sepolia] ✓ Confirmed in block ${receipt.blockNumber} (gas: ${receipt.gasUsed})`);

            return tx.hash;
        } catch (error: any) {
            console.error(`[Sepolia] ✗ Failed to publish:`, error.message || error);
            return null;
        }
    }

    // ─── Confirm anchor on Besu ──────────────────────────────────────────
    async function confirmOnBesu(sequenceNumber: bigint, chain: string, txHash: string) {
        try {
            const tx = await anchorWritable.confirmAnchor(
                sequenceNumber,
                chain,
                ethers.keccak256(ethers.toUtf8Bytes(txHash))
            );
            await tx.wait();
            console.log(`[Besu] ✓ Anchor confirmed for ${chain} (seq #${sequenceNumber})`);
        } catch (error: any) {
            console.error(`[Besu] ✗ Failed to confirm anchor for ${chain}:`, error.message || error);
        }
    }

    // ─── Event Listener ──────────────────────────────────────────────────
    anchorReadOnly.on("CheckpointCreated", async (sequenceNumber: bigint, merkleRoot: string, count: bigint, blockNo: bigint, timestamp: bigint) => {
        console.log("═".repeat(60));
        console.log(`[Besu] New Checkpoint Detected!`);
        console.log(`       Sequence:       #${sequenceNumber}`);
        console.log(`       Merkle Root:    ${merkleRoot}`);
        console.log(`       Disbursements:  ${count}`);
        console.log(`       Block:          ${blockNo}`);
        console.log("═".repeat(60));

        // Always post to Polygon Amoy
        const polygonTxHash = await publishToPolygon(sequenceNumber, merkleRoot);
        if (polygonTxHash) {
            await confirmOnBesu(sequenceNumber, "polygon_amoy", polygonTxHash);
        }

        // Post to Sepolia every SEPOLIA_CHECKPOINT_INTERVAL checkpoints
        if (Number(sequenceNumber) % SEPOLIA_CHECKPOINT_INTERVAL === 0) {
            const sepoliaTxHash = await publishToSepolia(sequenceNumber, merkleRoot);
            if (sepoliaTxHash) {
                await confirmOnBesu(sequenceNumber, "ethereum_sepolia", sepoliaTxHash);
            }
        }

        console.log("");
    });
}

main().catch(console.error);
