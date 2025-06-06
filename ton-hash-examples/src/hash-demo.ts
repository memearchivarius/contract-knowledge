import { TonClient, WalletContractV4, internal } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { toNano, beginCell, Cell, Address } from "@ton/core";

// === CONFIGURATION ===
const MNEMONIC = process.env.TON_MNEMONIC?.split(" ") || [
    "ticket", "sea", "movie", "present", "outer", "dash", "attract", "clip",
    "pepper", "slow", "employ", "rubber", "one", "gentle", "razor", "step", 
    "method", "alien", "cash", "tooth", "side", "green", "tired", "honey"
];

// === UTILITY FUNCTIONS ===
async function sleep(seconds: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function apiCallWithRetry<T>(
    apiCall: () => Promise<T>, 
    maxRetries: number = 3, 
    delaySeconds: number = 3
): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 1) await sleep(delaySeconds);
            return await apiCall();
        } catch (error: any) {
            const isRateLimit = error?.response?.status === 429 || error?.status === 429;
            if (attempt === maxRetries) throw error;
            if (isRateLimit) await sleep(delaySeconds * attempt);
        }
    }
    throw new Error("Max retries exceeded");
}

/**
 * Функция нормализации external message согласно TEP-467
 * https://raw.githubusercontent.com/ton-blockchain/TEPs/8b3beda2d8611c90ec02a18bec946f5e33a80091/text/0467-normalized-message-hash.md
 * 
 * ВАЖНЫЕ МОМЕНТЫ:
 * 1. Source Address (src): ВСЕГДА устанавливается в addr_none$00
 * 2. Import Fee (import_fee): ВСЕГДА устанавливается в 0  
 * 3. StateInit (init): ВСЕГДА устанавливается в empty
 * 4. Body: ВСЕГДА хранится как Reference (не inline)
 * 
 * СЛОЖНОСТЬ: нужно использовать Address.parse() с bounceable: false для корректного парсинга
 */
function normalizeExternalMessage(destAddress: Address, bodyCell: Cell): Cell {
    try {
        const normalizedExtMessage = beginCell()
            .storeUint(0b10, 2) // ext_msg prefix (10 in binary)
            .storeUint(0, 2) // src -> addr_none (НОРМАЛИЗАЦИЯ!)
            .storeAddress(Address.parse(destAddress.toString({ bounceable: false }))) // dest address
            .storeCoins(0) // import_fee:Grams -> 0 (НОРМАЛИЗАЦИЯ!)
            .storeBit(false) // init:(Maybe (Either StateInit ^StateInit)) -> nothing$0 (НОРМАЛИЗАЦИЯ!)
            .storeBit(true) // body:(Either X ^X) -> right$1 (НОРМАЛИЗАЦИЯ!)
            .storeRef(bodyCell) // Store body as reference (НОРМАЛИЗАЦИЯ!)
            .endCell();

        return normalizedExtMessage;
    } catch (error: any) {
        console.error("❌ Error in normalization:", error.message);
        throw error;
    }
}

/**
 * Поиск транзакции по хэшу в блокчейне
 * 
 * СЛОЖНОСТИ:
 * 1. Нужно конвертировать между hex и base64 форматами
 * 2. Хэши могут находиться в разных полях: in_msg.hash, body_hash, transaction_id.hash
 * 3. Новые транзакции появляются в API с задержкой (нужно ждать ~10 сек)
 */
async function findTransactionByHash(address: string, txHash: string): Promise<string | null> {
    /* ALTERNATIVE API: TonAPI (более современный, но требует ключ)
    try {
        const tonApiUrl = `https://testnet.tonapi.io/v2/accounts/${address}/traces?limit=10`;
        const tonApiRes = await fetch(tonApiUrl, {
            headers: {
                'Authorization': 'Bearer YOUR_API_KEY_HERE'
            }
        });
        
        if (tonApiRes.ok) {
            const tonApiData = await tonApiRes.json();
            const txHashBase64 = Buffer.from(txHash, 'hex').toString('base64');
            
            for (const trace of tonApiData.traces || []) {
                // TonAPI предоставляет external_hash и hash_norm напрямую
                if (trace.external_hash === txHashBase64 || trace.hash_norm === txHashBase64) {
                    return txHash;
                }
            }
        }
    } catch (e) {
        console.log("TonAPI failed, falling back to TonCenter...");
    }
    */

    // ОСНОВНОЙ API: TonCenter (публичный, но ограниченный)
    const url = `https://testnet.toncenter.com/api/v2/getTransactions?address=${address}&limit=10`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (!data.ok) return null;
    
    const txHashBase64 = Buffer.from(txHash, 'hex').toString('base64');
    
    for (const tx of data.result) {
        const inMsgHash = tx.in_msg?.hash;
        const txId = tx.transaction_id?.hash;
        const bodyHash = tx.in_msg?.body_hash;
        
        // Конвертируем base64 хэши в hex для сравнения
        const inMsgHashHex = inMsgHash ? Buffer.from(inMsgHash, 'base64').toString('hex') : '';
        const txIdHex = txId ? Buffer.from(txId, 'base64').toString('hex') : '';
        const bodyHashHex = bodyHash ? Buffer.from(bodyHash, 'base64').toString('hex') : '';
        
        // Проверяем все возможные варианты (base64 и hex)
        if (inMsgHash === txHashBase64 || 
            txId === txHashBase64 || 
            bodyHash === txHashBase64 ||
            inMsgHashHex === txHash ||
            txIdHex === txHash ||
            bodyHashHex === txHash) {
            return txHash;
        }
    }
    
    return null;
}

async function main() {
    console.log("=== TON Hash CLI Demo ===\n");

    // 1. Создание тела сообщения
    const messageBody = beginCell()
        .storeUint(0, 32) // op code
        .storeStringTail("Hello TON!")
        .endCell();
    
    console.log("Message Body Hash:", messageBody.hash().toString("hex"));

    // 2. Инициализация кошелька
    const keyPair = await mnemonicToPrivateKey(MNEMONIC);
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    const walletAddress = wallet.address;
    console.log("Wallet Address:", walletAddress.toString());

    try {
        const client = new TonClient({ 
            endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC" 
        });
        const contract = client.open(wallet);

        // 3. Получение данных кошелька
        const seqno = await apiCallWithRetry(() => contract.getSeqno());
        const balance = await apiCallWithRetry(() => contract.getBalance());
        console.log("Current seqno:", seqno);
        console.log("Wallet balance:", balance.toString(), "nanotons");

        if (balance < toNano("0.02")) {
            console.log("⚠️ Insufficient balance for transaction");
            return;
        }

        // 4. Создание external message через wrapper
        const internalMessage = internal({
            to: walletAddress,
            value: toNano("0.01"),
            body: messageBody
        });

        const externalMessage = await contract.createTransfer({
            seqno,
            secretKey: keyPair.secretKey,
            messages: [internalMessage]
        });
        
        const originalHash = externalMessage.hash().toString("hex");
        const originalBoC = externalMessage.toBoc().toString("base64");
        console.log("\nOriginal External Message Hash:", originalHash);
        console.log("Original External Message BoC:", originalBoC);

        // 5. === ДЕМОНСТРАЦИЯ НОРМАЛИЗАЦИИ СОГЛАСНО TEP-467 ===
        console.log("\n=== HASH NORMALIZATION DEMONSTRATION ===");
        
        // Создаем нормализованную версию того же сообщения
        const normalizedExternalMessage = normalizeExternalMessage(walletAddress, messageBody);
        const normalizedHash = normalizedExternalMessage.hash().toString("hex");
        const normalizedBoC = normalizedExternalMessage.toBoc().toString("base64");
        
        console.log("Original Hash:   ", originalHash);
        console.log("Normalized Hash:", normalizedHash);
        console.log("Original BoC:    ", originalBoC);
        console.log("Normalized BoC:  ", normalizedBoC);
        
        // Сравнение результатов
        if (originalHash === normalizedHash) {
            console.log("\nРАВНЫЕ хэши: оригинальное сообщение уже было нормализовано");
        } else {
            console.log("\nРАЗНЫЕ хэши!");
        }

        // 6. Отправка в блокчейн и поиск
        console.log("\n📡 Sending transaction...");
        await apiCallWithRetry(async () => {
            await contract.send(externalMessage);
            return true;
        });
        console.log("✅ Transaction sent successfully");

        // Ждем появления в блокчейне
        console.log("Searching for transaction in blockchain...");
        await sleep(10); // Транзакции появляются с задержкой
        
        const foundOriginal = await apiCallWithRetry(() => 
            findTransactionByHash(walletAddress.toString(), originalHash)
        );
        
        const foundNormalized = await apiCallWithRetry(() => 
            findTransactionByHash(walletAddress.toString(), normalizedHash)
        );
        
        console.log("\nBlockchain Search Results:");
        console.log("Original hash found:   ", foundOriginal ? "✅ YES" : "❌ NO");
        console.log("Normalized hash found: ", foundNormalized ? "✅ YES" : "❌ NO");

        console.log(`\n🔗 Check transaction: https://testnet.tonscan.org/address/${walletAddress.toString()}`);

    } catch (error: any) {
        console.error("❌ Error:", error.message || error);
    }

    console.log("\n🎉 === Demo Complete ===");
}

main().catch((e: any) => {
    console.error("❌ Fatal Error:", e.message || e);
    process.exit(1);
}); 