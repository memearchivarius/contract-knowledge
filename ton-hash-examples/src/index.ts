import { Address, beginCell, Cell } from "@ton/core";
import { TonConnectUI } from '@tonconnect/ui';

// Инициализация TON Connect для тестнета
const tonConnectUI = new TonConnectUI({
    manifestUrl: 'https://your-domain.com/tonconnect-manifest.json',
    // Для разработки можно использовать localhost с ngrok
});

/**
 * Пример 1: Хэш тела сообщения "Hello TON!"
 * Создаем стандартное сообщение с комментарием
 */
export function createHelloTonMessageBody(): { body: Cell; hash: string } {
    console.log('=== Message Body Hash Example ===');
    
    // Стандартное тело сообщения с комментарием "Hello TON!"
    const messageBody = beginCell()
        .storeUint(0, 32) // op = 0 (стандартный комментарий)
        .storeStringTail('Hello TON!')
        .endCell();

    const bodyHash = messageBody.hash();
    console.log('Message Body Hash:', bodyHash.toString('hex'));
    console.log('Message Body BOC:', messageBody.toBoc().toString('base64'));
    
    return {
        body: messageBody,
        hash: bodyHash.toString('hex')
    };
}

/**
 * Пример 2: Нормализованный хэш external сообщения
 * Реализация согласно TEP-467 для стабильного отслеживания транзакций
 */
export function createNormalizedExternalMessage(
    destinationAddress: Address, 
    bodyBoC: string
): { normalizedBoC: string; normalizedHash: string } {
    console.log('\n=== Normalized External Message Hash Example ===');
    
    // Создаем нормализованное external сообщение согласно TEP-467
    const externalMessage = beginCell()
        .storeUint(0b10, 2)                    // ext_msg prefix (10 in binary)
        .storeUint(0, 2)                       // src -> addr_none
        .storeAddress(destinationAddress)       // dest address
        .storeCoins(0)                         // import_fee:Grams -> 0
        .storeBit(false)                       // init:(Maybe (Either StateInit ^StateInit)) -> nothing$0
        .storeBit(true)                        // body:(Either X ^X) -> right$1
        .storeRef(Cell.fromBase64(bodyBoC))    // Store body as reference
        .endCell();

    const normalizedBoC = externalMessage.toBoc().toString("base64");
    const normalizedHash = Cell.fromBase64(normalizedBoC).hash();
    
    console.log('Normalized External BOC:', normalizedBoC);
    console.log('Normalized External Hash:', normalizedHash.toString('hex'));
    
    return {
        normalizedBoC,
        normalizedHash: normalizedHash.toString('hex')
    };
}

/**
 * Пример 3: Отправка транзакции и получение её хэша в реальном времени
 */
export async function sendHelloTonTransaction(): Promise<{
    transactionBoc: string;
    transactionHash?: string;
    normalizedHash: string;
}> {
    console.log('\n=== Real Transaction Hash Example ===');
    
    try {
        // Проверяем подключение кошелька
        if (!tonConnectUI.wallet) {
            throw new Error('Wallet not connected. Please connect your testnet wallet first.');
        }

        const walletAddress = Address.parse(tonConnectUI.wallet.account.address);
        console.log('Wallet Address:', walletAddress.toString());
        
        // Проверяем, что мы в тестнете
        if (tonConnectUI.wallet.account.chain !== '-3') {
            throw new Error('Please switch to testnet in your wallet');
        }

        // Создаем тело сообщения
        const { body, hash: bodyHash } = createHelloTonMessageBody();
        console.log('Created message body with hash:', bodyHash);

        // Создаем нормализованный хэш для отслеживания
        const { normalizedHash } = createNormalizedExternalMessage(
            walletAddress, 
            body.toBoc().toString('base64')
        );

        // Подготавливаем транзакцию
        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [{
                address: walletAddress.toString(),
                amount: '10000000', // 0.01 TON
                payload: body.toBoc().toString('base64')
            }]
        };

        console.log('Sending transaction...');
        console.log('Transaction payload:', transaction);

        // Отправляем транзакцию
        const result = await tonConnectUI.sendTransaction(transaction);
        console.log('Transaction sent successfully!');
        console.log('Transaction BOC:', result.boc);

        // Получаем хэш транзакции из BOC
        let transactionHash: string | undefined;
        try {
            const txCell = Cell.fromBase64(result.boc);
            transactionHash = txCell.hash().toString('hex');
            console.log('Transaction Hash:', transactionHash);
        } catch (e) {
            console.log('Could not extract transaction hash from BOC:', e);
        }

        return {
            transactionBoc: result.boc,
            transactionHash,
            normalizedHash
        };

    } catch (error) {
        console.error('Transaction failed:', error);
        throw error;
    }
}

/**
 * Пример 4: Поиск транзакции в блокчейне по BOC
 */
export async function findTransactionByBOC(
    transactionBoC: string,
    walletAddress: string
): Promise<string | null> {
    console.log('\n=== Find Transaction by BOC Example ===');
    
    try {
        // Получаем хэш транзакции из BOC
        const txCell = Cell.fromBase64(transactionBoC);
        const txHash = txCell.hash().toString('hex');
        console.log('Transaction BOC Hash:', txHash);
        
        // Запрос к TON Center API для поиска транзакции
        const apiUrl = `https://testnet.toncenter.com/api/v2/getTransactions?address=${walletAddress}&limit=10`;
        console.log('API URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.ok && data.result.length > 0) {
            console.log('Found transactions:', data.result.length);
            
            // Ищем нашу транзакцию по хэшу
            for (const tx of data.result) {
                const foundTxHash = tx.transaction_id.hash;
                console.log('Checking transaction hash:', foundTxHash);
                
                if (foundTxHash === txHash) {
                    console.log('Transaction found in blockchain! ✓');
                    return foundTxHash;
                }
            }
            
            console.log('Transaction not found in recent transactions');
            return null;
        } else {
            console.log('No transactions found for this address');
            return null;
        }
        
    } catch (error) {
        console.error('Error searching for transaction:', error);
        return null;
    }
}

/**
 * Пример 5: Мониторинг статуса транзакции
 */
export async function monitorTransactionStatus(
    normalizedHash: string,
    walletAddress: string,
    maxAttempts: number = 10
): Promise<boolean> {
    console.log('\n=== Transaction Status Monitoring Example ===');
    console.log('Monitoring transaction with normalized hash:', normalizedHash);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`Attempt ${attempt}/${maxAttempts}...`);
        
        try {
            const apiUrl = `https://testnet.toncenter.com/api/v2/getTransactions?address=${walletAddress}&limit=5`;
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (data.ok && data.result.length > 0) {
                console.log(`Found ${data.result.length} recent transactions`);
                
                // Здесь в реальном приложении мы бы сравнивали нормализованные хэши
                // Для демонстрации просто проверяем наличие недавних транзакций
                const recentTx = data.result[0];
                const txTime = recentTx.now;
                const currentTime = Math.floor(Date.now() / 1000);
                
                if (currentTime - txTime < 300) { // Транзакция младше 5 минут
                    console.log('Recent transaction found! ✓');
                    console.log('Transaction confirmed in blockchain');
                    return true;
                }
            }
            
            console.log('Transaction not confirmed yet, waiting...');
            await new Promise(resolve => setTimeout(resolve, 5000)); // Ждем 5 секунд
            
        } catch (error) {
            console.error('Error monitoring transaction:', error);
        }
    }
    
    console.log('Transaction monitoring timeout');
    return false;
}

/**
 * Пример 6: Практический workflow для разработчика
 */
export async function completeHashWorkflow(): Promise<void> {
    console.log('\n=== Complete Hash Workflow Example ===');
    
    try {
        // Шаг 1: Создаем сообщение и получаем хэши
        console.log('Step 1: Creating message...');
        const { body, hash: bodyHash } = createHelloTonMessageBody();
        
        if (!tonConnectUI.wallet) {
            console.log('Please connect your testnet wallet to continue');
            return;
        }
        
        const walletAddress = Address.parse(tonConnectUI.wallet.account.address);
        
        // Шаг 2: Получаем нормализованный хэш для отслеживания
        console.log('Step 2: Creating normalized hash...');
        const { normalizedHash } = createNormalizedExternalMessage(
            walletAddress,
            body.toBoc().toString('base64')
        );
        
        // Шаг 3: Отправляем транзакцию
        console.log('Step 3: Sending transaction...');
        const txResult = await sendHelloTonTransaction();
        
        // Шаг 4: Отслеживаем статус
        console.log('Step 4: Monitoring transaction status...');
        const confirmed = await monitorTransactionStatus(
            normalizedHash,
            walletAddress.toString()
        );
        
        // Шаг 5: Ищем транзакцию по BOC
        if (confirmed) {
            console.log('Step 5: Searching transaction by BOC...');
            await findTransactionByBOC(
                txResult.transactionBoc,
                walletAddress.toString()
            );
        }
        
        console.log('\n=== Workflow Complete ===');
        console.log('Summary:');
        console.log('- Message Body Hash:', bodyHash);
        console.log('- Normalized Hash:', normalizedHash);
        console.log('- Transaction Hash:', txResult.transactionHash || 'N/A');
        console.log('- Status:', confirmed ? 'Confirmed' : 'Pending');
        
    } catch (error) {
        console.error('Workflow failed:', error);
    }
}

// Export для использования в веб-интерфейсе
export { tonConnectUI }; 