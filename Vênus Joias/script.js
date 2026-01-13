let pedidos = [];
let itensTemporarios = [];

// 1. Carregar dados
window.onload = function() {
    const salvos = localStorage.getItem('pedidos_venus_v2');
    if (salvos) {
        pedidos = JSON.parse(salvos);
        renderizarPedidos();
    }
};

// 2. Adicionar Item na Lista Temporária (Antes de salvar o pedido)
function adicionarItemNaLista() {
    const nome = document.getElementById('itemNome').value;
    const valor = parseFloat(document.getElementById('itemValor').value);
    const qtd = parseInt(document.getElementById('itemQtd').value);

    if (!nome || isNaN(valor) || isNaN(qtd)) {
        alert("Preencha os dados do item corretamente.");
        return;
    }

    itensTemporarios.push({
        nome,
        valor,
        qtd,
        total: valor * qtd
    });

    document.getElementById('itemNome').value = '';
    document.getElementById('itemValor').value = '';
    document.getElementById('itemQtd').value = '1';

    atualizarListaTemporaria();
}

function atualizarListaTemporaria() {
    const container = document.getElementById('listaItensTemporaria');
    const btnFinalizar = document.getElementById('btnFinalizarPedido');
    
    container.innerHTML = '<strong>Itens do Pedido:</strong>';
    
    itensTemporarios.forEach((item, index) => {
        container.innerHTML += `
            <div class="item-temp-linha">
                <span>${item.qtd}x ${item.nome}</span>
                <span>R$ ${item.total.toFixed(2)}</span>
            </div>
        `;
    });

    btnFinalizar.style.display = itensTemporarios.length > 0 ? 'block' : 'none';
}

// 3. Finalizar o Pedido Completo
function finalizarPedido() {
    const cliente = document.getElementById('cliente').value;
    const dataInput = document.getElementById('data').value;

    if (!cliente || !dataInput) {
        alert("Informe a cliente e a data.");
        return;
    }

    const totalGeral = itensTemporarios.reduce((sum, item) => sum + item.total, 0);

    const novoPedido = {
        id: Date.now(),
        cliente,
        data: formatarData(dataInput),
        itens: itensTemporarios,
        totalGeral: totalGeral
    };

    pedidos.unshift(novoPedido); // Adiciona no topo da lista
    localStorage.setItem('pedidos_venus_v2', JSON.stringify(pedidos));
    
    // Resetar tudo
    itensTemporarios = [];
    document.getElementById('cliente').value = '';
    document.getElementById('data').value = '';
    atualizarListaTemporaria();
    renderizarPedidos();
}

// 4. Renderizar Histórico
function renderizarPedidos() {
    const container = document.getElementById('containerPedidos');
    const msgVazio = document.getElementById('mensagemVazio');
    container.innerHTML = '';

    if (pedidos.length === 0) {
        msgVazio.style.display = 'block';
        return;
    }
    msgVazio.style.display = 'none';

    pedidos.forEach(p => {
        let itensHtml = p.itens.map(i => `
            <div class="pedido-item">
                <span>${i.nome}</span>
                <span>${i.qtd}x</span>
                <span>R$ ${i.valor.toFixed(2)}</span>
                <span>R$ ${i.total.toFixed(2)}</span>
            </div>
        `).join('');

        container.innerHTML += `
            <div class="pedido-salvo">
                <div class="pedido-header">
                    <span>Cliente: ${p.cliente}</span>
                    <span>${p.data}</span>
                </div>
                ${itensHtml}
                <div class="pedido-footer">
                    Total do Pedido: R$ ${p.totalGeral.toFixed(2)}
                    <br>
                    <button class="btn-excluir-pedido" onclick="excluirPedido(${p.id})">Excluir Pedido</button>
                </div>
            </div>
        `;
    });
}

function excluirPedido(id) {
    if (confirm("Excluir este pedido permanentemente?")) {
        pedidos = pedidos.filter(p => p.id !== id);
        localStorage.setItem('pedidos_venus_v2', JSON.stringify(pedidos));
        renderizarPedidos();
    }
}

function formatarData(data) {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
}