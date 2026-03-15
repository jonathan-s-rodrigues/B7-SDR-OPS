// Simulação de Banco de Dados (Substituir futuramente pelo Firebase)
const productsData = [
    { id: 6, name: "Brinco Bola 4", price: 0.00, category: "brincos", img: "Imagens/brincobola4.webp" },
    { id: 7, name: "Brinco Bola 5", price: 0.00, category: "brincos", img: "Imagens/brincobola5.webp" },
    { id: 8, name: "Brinco Bola 6", price: 0.00, category: "brincos", img: "Imagens/brincobola6.webp" },
    { id: 9, name: "Brinco Quad Mina", price: 0.00, category: "brincos", img: "Imagens/brincoquadmina.webp" },
    { id: 10, name: "Brinco Quad Zirconia", price: 0.00, category: "brincos", img: "Imagens/brincoquadzirconia.webp" },
    { id: 11, name: "Brinco Trio Borboleta", price: 0.00, category: "brincos", img: "Imagens/brincotrioborboleta.webp" },
    { id: 12, name: "Brinco Trio CBF", price: 0.00, category: "brincos", img: "Imagens/brincotriocbf.webp" },
    { id: 13, name: "Colar Coração", price: 0.00, category: "colares", img: "Imagens/colarcoracao.webp" },
    { id: 14, name: "Conjunto Borboleta", price: 0.00, category: "conjuntos", img: "Imagens/conjborboleta.webp" },
    { id: 15, name: "Corrente Singapura com Bola", price: 0.00, category: "correntes", img: "Imagens/correntesingapuracombola.webp" },
    { id: 16, name: "Corrente Singapura Grossa", price: 0.00, category: "correntes", img: "Imagens/correntesingapuragrossa.webp" },
    { id: 17, name: "Corrente Veneziana 50cm", price: 0.00, category: "correntes", img: "Imagens/correnteveneziana50cm.webp" },
    { id: 18, name: "Kit 3 Venezianas", price: 0.00, category: "conjuntos", img: "Imagens/kit3venezianas.webp" },
    { id: 19, name: "Limpa Prata", price: 0.00, category: "acessorios", img: "Imagens/limpaprata.webp" },
    { id: 20, name: "Pingente Menina", price: 0.00, category: "acessorios", img: "Imagens/pingmenina.webp" },
    { id: 21, name: "Pingente Menino", price: 0.00, category: "acessorios", img: "Imagens/pingmenino.webp" },
    { id: 22, name: "Pulseira 3 Borboletas", price: 0.00, category: "pulseiras", img: "Imagens/pulseira3borboletas.webp" },
    { id: 23, name: "Pulseira 3 Margaridas", price: 0.00, category: "pulseiras", img: "Imagens/pulseira3margaridas.webp" },
    { id: 24, name: "Pulseira 5 Corações", price: 0.00, category: "pulseiras", img: "Imagens/pulseira5coracoes.webp" },
    { id: 25, name: "Pulseira Ariana 3", price: 0.00, category: "pulseiras", img: "Imagens/pulseiraariana3.webp" },
    { id: 26, name: "Pulseira Coração Vazado Ponto Azul", price: 0.00, category: "pulseiras", img: "Imagens/pulseiracoracaovazadopontoazul.webp" },
    { id: 27, name: "Pulseira Elo Porto", price: 0.00, category: "pulseiras", img: "Imagens/pulseiraeloporto.webp" },
    { id: 28, name: "Pulseira Fio Torcido", price: 0.00, category: "pulseiras", img: "Imagens/pulseirafiotorcido.webp" },
    { id: 29, name: "Pulseira Nó", price: 0.00, category: "pulseiras", img: "Imagens/pulseirano.webp" },
    { id: 30, name: "Pulseira Singapura 3mm", price: 0.00, category: "pulseiras", img: "Imagens/pulseirasingapura3mm.webp" },
    { id: 31, name: "Pulseira Trança 3 Fios", price: 0.00, category: "pulseiras", img: "Imagens/pulseiratranca3fios.webp" },
    { id: 32, name: "Pulseira V12 com Bolinha", price: 0.00, category: "pulseiras", img: "Imagens/pulseirav12combolinha.webp" },
    { id: 33, name: "Tornozeleira Borboleta e Ponto", price: 0.00, category: "tornozeleiras", img: "Imagens/tornoborboletaeponto.webp" },
    { id: 34, name: "Tornozeleira Borboleta e Ponto Azul", price: 0.00, category: "tornozeleiras", img: "Imagens/tornoborboletaepontoazul.webp" },
];

// Estado da Aplicação
let cart = JSON.parse(localStorage.getItem('venusCart')) || [];

// Elementos do DOM
const grid = document.getElementById('products-grid');
const cartModal = document.getElementById('cart-modal');
const cartBtn = document.getElementById('cart-btn');
const closeCartBtn = document.getElementById('close-cart');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');
const cartCountEl = document.getElementById('cart-count');
const filterBtns = document.querySelectorAll('.filter-btn');
const checkoutBtn = document.getElementById('checkout-btn');

// Inicialização
function init() {
    renderProducts(productsData);
    updateCartUI();
}

// Renderizar Produtos
function renderProducts(products) {
    grid.innerHTML = '';
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.img}" alt="${product.name}" class="product-img">
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-price">${formatCurrency(product.price)}</p>
                <button class="btn-add" onclick="addToCart(${product.id})">Adicionar à Sacola</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Adicionar ao Carrinho
window.addToCart = (id) => {
    const product = productsData.find(p => p.id === id);
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    updateCartUI();
    saveCart();
    // Feedback visual simples
    alert('Produto adicionado!'); 
};

// Remover do Carrinho
window.removeFromCart = (id) => {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
    saveCart();
};

// Atualizar UI do Carrinho
function updateCartUI() {
    cartItemsContainer.innerHTML = '';
    let total = 0;
    let count = 0;

    cart.forEach(item => {
        total += item.price * item.quantity;
        count += item.quantity;

        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <div>
                <h4>${item.name}</h4>
                <p>${item.quantity}x ${formatCurrency(item.price)}</p>
            </div>
            <button onclick="removeFromCart(${item.id})" style="border:none; background:none; color:red; cursor:pointer;">&times;</button>
        `;
        cartItemsContainer.appendChild(itemEl);
    });

    cartTotalEl.innerText = formatCurrency(total);
    cartCountEl.innerText = count;
}

// Salvar no LocalStorage
function saveCart() {
    localStorage.setItem('venusCart', JSON.stringify(cart));
}

// Formatar Moeda
function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Filtros
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class de todos
        filterBtns.forEach(b => b.classList.remove('active'));
        // Adiciona ao clicado
        btn.classList.add('active');
        
        const category = btn.getAttribute('data-cat');
        if (category === 'todos') {
            renderProducts(productsData);
        } else {
            const filtered = productsData.filter(p => p.category === category);
            renderProducts(filtered);
        }
    });
});

// Modal Logica
cartBtn.addEventListener('click', () => cartModal.classList.add('open'));
closeCartBtn.addEventListener('click', () => cartModal.classList.remove('open'));

// Finalizar no WhatsApp
checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) return alert('Seu carrinho está vazio!');

    let message = "Olá! Gostaria de finalizar meu pedido na Vênus Joias:\n\n";
    cart.forEach(item => {
        message += `- ${item.name} (${item.quantity}x)\n`;
    });
    
    // Calcula o total limpo para a mensagem
    const totalValue = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    message += `\n*Total: ${formatCurrency(totalValue)}*`;

    // Codifica a mensagem para URL
    const encodedMessage = encodeURIComponent(message);
    const phone = "5511999999999"; // COLOQUE SEU NÚMERO AQUI
    
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
});

// Iniciar
init();