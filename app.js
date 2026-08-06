const connectBtn = document.getElementById('connectBtn');
const swapBtn = document.getElementById('swapBtn');
const statusText = document.getElementById('status');
const ethInput = document.getElementById('ethAmount');
const usdcInput = document.getElementById('usdcAmount');
const balanceDisplay = document.getElementById('balanceDisplay');

let signer, userAddress;

// Base Ağı Kontrat Adresleri
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const ROUTER_ADDRESS = "0x2626664c2603336e57b271c530b26c623840c639"; // Uniswap V3 SwapRouter02

const WETH_ABI = [
    "function deposit() public payable",
    "function approve(address spender, uint256 amount) public returns (bool)"
];

const ROUTER_ABI = [
    "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)"
];

const BASE_CHAIN = {
    chainId: '0x2105', 
    chainName: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org']
};

async function ensureBaseNetwork() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: BASE_CHAIN.chainId }],
        });
    } catch (switchError) {
        if (switchError.code === 4902) {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [BASE_CHAIN],
            });
        }
    }
}

ethInput.addEventListener('input', () => {
    const val = parseFloat(ethInput.value) || 0;
    usdcInput.value = (val * 2600).toFixed(2);
});

connectBtn.addEventListener('click', async () => {
    if (typeof window.ethereum !== 'undefined') {
        try {
            await ensureBaseNetwork();
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            userAddress = accounts[0];
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();

            const balanceWei = await provider.getBalance(userAddress);
            balanceDisplay.innerText = `Bakiye: ${parseFloat(ethers.utils.formatEther(balanceWei)).toFixed(4)} ETH`;

            connectBtn.style.display = "none";
            swapBtn.style.display = "block";
            statusText.innerText = "Base ağına bağlandı.";
        } catch (err) {
            statusText.innerText = "Bağlantı reddedildi.";
        }
    } else {
        statusText.innerText = "Lütfen cüzdan yükleyin.";
    }
});

swapBtn.addEventListener('click', async () => {
    const amountVal = ethInput.value;
    if (!amountVal || amountVal <= 0) {
        statusText.innerText = "Geçerli bir miktar girin.";
        return;
    }

    try {
        await ensureBaseNetwork();
        const amountWei = ethers.utils.parseEther(amountVal);

        // 1. Adım: ETH'yi WETH'e çevir (Wrap)
        statusText.innerText = "1/2: ETH WETH'e dönüştürülüyor...";
        const wethContract = new ethers.Contract(WETH_ADDRESS, WETH_ABI, signer);
        const depositTx = await wethContract.deposit({ value: amountWei });
        await depositTx.wait();

        // 2. Adım: Router'a harcama izni ver (Approve)
        statusText.innerText = "2/3: Router izni onaylanıyor...";
        const approveTx = await wethContract.approve(ROUTER_ADDRESS, amountWei);
        await approveTx.wait();

        // 3. Adım: Uniswap V3 üzerinden gerçek Swap işlemi
        statusText.innerText = "3/3: Swap gerçekleştiriliyor...";
        const routerContract = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);
        
        const params = {
            tokenIn: WETH_ADDRESS,
            tokenOut: USDC_ADDRESS,
            fee: 3000, // %0.3 havuz oranı
            recipient: userAddress,
            deadline: Math.floor(Date.now() / 1000) + 600,
            amountIn: amountWei,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        };

        const swapTx = await routerContract.exactInputSingle(params);
        await swapTx.wait();

        statusText.innerText = "🎉 Başarılı! Gerçek Swap tamamlandı.";
    } catch (err) {
        statusText.innerText = "Hata: " + (err.reason || err.message || "İşlem iptal edildi.");
        console.error(err);
    }
});
