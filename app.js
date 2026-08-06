const connectBtn = document.getElementById('connectBtn');
const swapBtn = document.getElementById('swapBtn');
const statusText = document.getElementById('status');
const ethInput = document.getElementById('ethAmount');
const usdcInput = document.getElementById('usdcAmount');
const balanceDisplay = document.getElementById('balanceDisplay');

let signer, userAddress;

const ROUTER_ADDRESS = "0x2626664c2603336e57b271c530b26c623840c639";

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
        statusText.innerText = "Cüzdandan onay bekleniyor...";

        const amountWei = ethers.utils.parseEther(amountVal);

        const tx = await signer.sendTransaction({
            to: ROUTER_ADDRESS,
            value: amountWei
        });

        statusText.innerText = "İşlem gönderildi, onaylanıyor...";
        await tx.wait();

        statusText.innerText = "🎉 Başarılı! Swap gerçekleşti.";
    } catch (err) {
        statusText.innerText = "Hata: " + (err.reason || err.message || "İşlem iptal edildi.");
    }
});
