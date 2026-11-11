import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCW99N-Ok683zmhwcTRSAeZ1o5fxLvSs44",
  authDomain: "pedidos-venus-joias.firebaseapp.com",
  projectId: "pedidos-venus-joias",
  storageBucket: "pedidos-venus-joias.firebasestorage.app",
  messagingSenderId: "504751234156",
  appId: "1:504751234156:web:dcf8f4c9b416c5d0fa4c49",
  measurementId: "G-K4RLW60R85"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const pedidosRef = collection(db, "pedidos");
const produtosRef = collection(db, "produtos");

let itensTemporarios = [];
let pedidosCache = [];
let produtosCache = [];
let produtoEmEdicao = null;
let fotoEmEdicao = null;
let precoFinalEditadoManualmente = false;
let salvandoPedido = false;
let pedidoRascunhoRef = null;
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function hojeLocal() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
}

function statusPedido(texto) {
    document.getElementById('statusPedido').textContent = texto;
}

function totalPedido() {
    return itensTemporarios.reduce((total, item) => total + Math.round(item.valor * 100) * item.qtd, 0) / 100;
}

function renderizarRascunhoPedido() {
    document.getElementById('listaItensTemporaria').innerHTML = itensTemporarios.length ? itensTemporarios.map((item, index) => `
        <div class="item-rascunho">
            <div><strong>${escapeHtml(item.nome)}</strong><small>${moeda.format(item.valor)} por unidade</small></div>
            <label>Qtd<input type="number" min="1" step="1" value="${item.qtd}" data-quantidade="${index}" aria-label="Quantidade de ${escapeHtml(item.nome)}"></label>
            <strong>${moeda.format(item.total)}</strong>
            <button class="btn-mini" data-remover="${index}" aria-label="Remover ${escapeHtml(item.nome)}">Remover</button>
        </div>`).join('') : '<p class="vazio">Nenhuma joia adicionada. Escolha um produto acima para começar.</p>';
    const quantidade = itensTemporarios.reduce((soma, item) => soma + item.qtd, 0);
    document.getElementById('quantidadePedido').textContent = `${quantidade} ${quantidade === 1 ? 'item' : 'itens'}`;
    document.getElementById('totalPedido').textContent = `Total: ${moeda.format(totalPedido())}`;
    document.getElementById('btnFinalizar').disabled = salvandoPedido || !itensTemporarios.length;
}

document.getElementById('data').value = hojeLocal();
document.getElementById('btnAddItem').addEventListener('click', () => {
    if (salvandoPedido) return;
    const nome = document.getElementById('itemNome').value.trim();
    const valor = Math.round(Number(document.getElementById('itemValor').value) * 100) / 100;
    const qtd = Number(document.getElementById('itemQtd').value);
    if (!nome || !Number.isFinite(valor) || valor <= 0 || !Number.isSafeInteger(qtd) || qtd < 1 || !Number.isSafeInteger(Math.round(valor * 100) * qtd)) {
        statusPedido('Informe o nome da joia, um valor maior que zero e uma quantidade inteira positiva.');
        return;
    }
    itensTemporarios.push({ nome, valor, qtd, total: Math.round(valor * 100) * qtd / 100 });
    renderizarRascunhoPedido();
    document.getElementById('itemNome').value = '';
    document.getElementById('itemValor').value = '';
    document.getElementById('itemQtd').value = '1';
    statusPedido('Item adicionado. Você pode incluir mais joias ou salvar o pedido.');
    document.getElementById('itemNome').focus();
});

document.getElementById('listaItensTemporaria').addEventListener('click', e => {
    const botao = e.target.closest('[data-remover]');
    if (!botao || salvandoPedido) return;
    itensTemporarios.splice(Number(botao.dataset.remover), 1);
    renderizarRascunhoPedido();
});

document.getElementById('listaItensTemporaria').addEventListener('change', e => {
    if (!e.target.matches('[data-quantidade]') || salvandoPedido) return;
    const item = itensTemporarios[Number(e.target.dataset.quantidade)];
    const qtd = Number(e.target.value);
    if (Number.isSafeInteger(qtd) && qtd > 0 && Number.isSafeInteger(Math.round(item.valor * 100) * qtd)) {
        item.qtd = qtd;
        item.total = Math.round(item.valor * 100) * qtd / 100;
        statusPedido('Quantidade atualizada.');
    } else statusPedido('A quantidade deve ser um número inteiro positivo.');
    renderizarRascunhoPedido();
});

document.getElementById('btnFinalizar').addEventListener('click', async () => {
    if (salvandoPedido) return;
    const cliente = document.getElementById('cliente').value.trim();
    const data = document.getElementById('data').value;
    if (!cliente || !data || !itensTemporarios.length) {
        statusPedido('Preencha o nome da cliente, a data e adicione pelo menos uma joia.');
        document.getElementById(!cliente ? 'cliente' : !data ? 'data' : 'itemNome').focus();
        return;
    }
    salvandoPedido = true;
    document.querySelectorAll('#aba-pedidos .no-print input, #aba-pedidos .no-print button').forEach(el => el.disabled = true);
    statusPedido('Salvando pedido…');
    try {
        pedidoRascunhoRef ||= doc(pedidosRef);
        await setDoc(pedidoRascunhoRef, { cliente, data, itens: itensTemporarios.map(i => ({ ...i })), totalGeral: totalPedido(), createdAt: new Date() });
        itensTemporarios = [];
        pedidoRascunhoRef = null;
        document.getElementById('cliente').value = '';
        document.getElementById('data').value = hojeLocal();
        statusPedido('Pedido salvo! Ele já está disponível no histórico abaixo.');
    } catch (error) {
        statusPedido('Não foi possível salvar. O pedido foi mantido para você tentar novamente. ' + error.message);
    } finally {
        salvandoPedido = false;
        document.querySelectorAll('#aba-pedidos .no-print input, #aba-pedidos .no-print button').forEach(el => el.disabled = false);
        renderizarRascunhoPedido();
    }
});
renderizarRascunhoPedido();

function loga(msg) { console.log(msg); }

const btnLogar = document.getElementById('btnLogar');


if (btnLogar) btnLogar.addEventListener('click', fazerLogin);


function fazerLogin() {
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;
    const erroTxt = document.getElementById('login-erro');

    if (email.trim().toLowerCase() === 'teste@venusjoias.com') {
        erroTxt.style.display = 'block';
        erroTxt.innerText = 'O acesso de teste foi desativado. Use sua conta administrativa.';
        return;
    }

    if (!email || !senha) {
        erroTxt.style.display = 'block';
        erroTxt.style.color = 'red';
        erroTxt.innerText = 'Informe e-mail e senha';
        return;
    }

    signInWithEmailAndPassword(auth, email, senha)
        .then((userCredential) => {
            loga('Login bem-sucedido: ' + userCredential.user.email);
            erroTxt.style.display = 'none';
        })
        .catch((error) => {
            loga('Erro no login: ' + error.message);
            erroTxt.style.display = 'block';
            erroTxt.style.color = 'red';
            erroTxt.innerText = 'Falha no acesso: ' + error.message;
        });
}


document.getElementById('btnSair').onclick = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    const overlay = document.getElementById('login-overlay');
    const btnSair = document.getElementById('btnSair');

    if (user?.email?.toLowerCase() === 'teste@venusjoias.com') {
        overlay.style.display = 'flex';
        btnSair.style.display = 'none';
        signOut(auth);
        return;
    }

    if (user) {
        overlay.style.display = 'none';
        btnSair.style.display = 'inline-block';
        carregarPedidosCloud();
        carregarProdutosCloud();
    } else {
        overlay.style.display = 'flex';
        btnSair.style.display = 'none';
    }
});

function carregarPedidosCloud() {
    onSnapshot(query(pedidosRef, orderBy('createdAt', 'desc')), (snapshot) => {
        pedidosCache = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        const container = document.getElementById('containerPedidos');
        if (!pedidosCache.length) {
            container.innerHTML = '<p class="vazio">Nenhum pedido salvo ainda. Monte seu primeiro pedido acima.</p>';
            return;
        }
        container.innerHTML = pedidosCache.map(p => `
            <div class="pedido-salvo">
                <div class="pedido-header"><span>Cliente: ${escapeHtml(p.cliente)}</span><span>${escapeHtml(p.data)}</span></div>
                ${p.itens.map(i => `<div class="pedido-item"><span>${escapeHtml(i.nome)}</span><span>${i.qtd}x</span><span>R$ ${i.total.toFixed(2)}</span></div>`).join('')}
                <div class="pedido-footer">Total Geral: R$ ${p.totalGeral.toFixed(2)}</div>
                <div class="acoes-pedido no-print">
                    <button class="btn-mini btn-whatsapp" onclick="enviarWhatsApp('${p.id}')">WhatsApp</button>
                    <button class="btn-mini" onclick="window.print()">Imprimir</button>
                    <button class="btn-mini" style="color:red" onclick="excluirPedido('${p.id}')">Excluir</button>
                </div>
            </div>
        `).join('');
    });
}

function carregarProdutosCloud() {
    onSnapshot(produtosRef, (snapshot) => {
        produtosCache = snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id })).sort((a, b) =>
            categoriaNome(a.categoria).localeCompare(categoriaNome(b.categoria), 'pt-BR') ||
            String(a.descricao || '').localeCompare(String(b.descricao || ''), 'pt-BR', { numeric: true }) || a.id.localeCompare(b.id));
        atualizarFiltroCategorias();
        atualizarListaProdutos();
        atualizarDatalistProdutos();
    });
}

function atualizarDatalistProdutos() {
    const list = document.getElementById('produtosList');
    if (!list) return;
    list.innerHTML = produtosCache
        .filter(p => p && p.descricao)
        .map(p => `<option value="${String(p.descricao).replaceAll('"', '&quot;')}"></option>`)
        .join('');
}

function atualizarListaProdutos() {
    const container = document.getElementById('listaProdutos');
    if (!container) return;
    if (!produtosCache.length) {
        container.innerHTML = '<p class="vazio">Nenhum produto cadastrado ainda.</p>';
        return;
    }
    const categoria = document.getElementById('filtroCategoria').value;
    const produtos = produtosCache.filter(p => !categoria || (p.categoria || 'itens') === categoria);
    container.innerHTML = produtos.map(produto => `
        <div class="produto-card">
            ${produto.foto ? `<img src="${escapeHtml(produto.foto)}" alt="${escapeHtml(produto.descricao)}" class="produto-foto">` : '<div class="produto-foto" style="display:flex;align-items:center;justify-content:center;color:#ccc;">Sem foto</div>'}
            <div class="produto-descricao">${escapeHtml(produto.descricao)}</div>
            <div class="produto-preco">
                <div style="margin-bottom:5px;">Categoria: <strong>${escapeHtml(categoriaNome(produto.categoria))}</strong></div>
                <div style="margin-bottom:5px;">Estoque: <strong>${parseInt(produto.estoque ?? 0, 10) || 0}</strong></div>
                <div style="margin-bottom:5px;">Custo: <span class="custo">R$ ${Number(produto.custo || 0).toFixed(2)}</span></div>
                <div style="margin-bottom:5px;">Sugerido: R$ ${Number((produto.precoSugerido ?? produto.precoFinal) || 0).toFixed(2)}</div>
                <div>Preço final: <span class="final">R$ ${Number(produto.precoFinal || 0).toFixed(2)}</span></div>
            </div>
            <div class="produto-acoes">
                <button class="btn-editar" onclick="editarProduto('${produto.id}')">Editar</button>
                <button class="btn-excluir" onclick="excluirProduto('${produto.id}')">Excluir</button>
            </div>
        </div>
    `).join('');
}

function calcularPrecoFinal() {
    const custo = parseFloat(document.getElementById('prodCusto').value) || 0;
    const embalagem = 9.00;
    const passo1 = custo * 1.20;
    document.getElementById('calc1').textContent = passo1.toFixed(2);
    const passo2 = passo1 + embalagem;
    document.getElementById('calc2').textContent = passo2.toFixed(2);
    const passo3 = passo2 * 1.10;
    document.getElementById('calc3').textContent = passo3.toFixed(2);
    const passo4 = passo3 * 1.20;
    document.getElementById('calc4').textContent = passo4.toFixed(2);
    const passo5 = passo4 * 1.10;
    document.getElementById('calc5').textContent = passo5.toFixed(2);
    document.getElementById('precoFinalCalc').textContent = passo5.toFixed(2);
    const inputPrecoFinal = document.getElementById('prodPrecoFinal');
    if (inputPrecoFinal && !precoFinalEditadoManualmente) {
        inputPrecoFinal.value = passo5 ? passo5.toFixed(2) : '';
    }
    return passo5;
}

document.getElementById('prodCusto').addEventListener('input', calcularPrecoFinal);
document.getElementById('prodPrecoFinal')?.addEventListener('input', () => {
    const v = parseFloat(document.getElementById('prodPrecoFinal').value);
    precoFinalEditadoManualmente = !isNaN(v);
});

let salvandoProduto = false;
let processandoFoto = false;
let novoProdutoRef = null;

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function categoriaNome(value) {
    const option = [...document.getElementById('prodCategoria').options].find(o => o.value === (value || 'itens'));
    return option?.textContent || String(value);
}

function atualizarFiltroCategorias() {
    const filtro = document.getElementById('filtroCategoria');
    const anterior = filtro.value;
    const categorias = [...new Set(produtosCache.map(p => p.categoria || 'itens'))];
    filtro.innerHTML = '<option value="">Todas as categorias</option>' + categorias.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(categoriaNome(c))}</option>`).join('');
    filtro.value = categorias.includes(anterior) ? anterior : '';
}
document.getElementById('filtroCategoria').addEventListener('change', atualizarListaProdutos);

function statusProduto(mensagem) {
    document.getElementById('statusProduto').textContent = mensagem;
}

function bloquearEditor(bloquear) {
    document.querySelectorAll('#formProduto input, #formProduto select, #formProduto button').forEach(el => el.disabled = bloquear);
}

async function otimizarFoto(arquivo) {
    if (!arquivo.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem.');
    if (arquivo.size > 10 * 1024 * 1024) throw new Error('Escolha uma imagem de até 10 MB.');
    const url = URL.createObjectURL(arquivo);
    try {
        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error('Não foi possível abrir a imagem. Tente um arquivo JPG, PNG ou WebP.'));
            img.src = url;
        });
        const canvas = document.createElement('canvas');
        const escala = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
        canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Keep the encoded image below 700 KB, leaving room for Firestore document fields.
        for (const qualidade of [0.85, 0.7, 0.55, 0.4]) {
            const foto = canvas.toDataURL('image/jpeg', qualidade);
            if (foto.length <= 700000) return foto;
        }
        throw new Error('A imagem ainda está muito grande. Escolha uma foto menor.');
    } finally {
        URL.revokeObjectURL(url);
    }
}

document.getElementById('prodFoto').addEventListener('change', async e => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    processandoFoto = true;
    bloquearEditor(true);
    statusProduto('Preparando imagem…');
    try {
        fotoEmEdicao = await otimizarFoto(arquivo);
        document.getElementById('imgPreview').src = fotoEmEdicao;
        document.getElementById('imgPreview').style.display = 'block';
        document.getElementById('textoPreview').style.display = 'none';
        statusProduto('Imagem pronta. Clique em salvar para confirmar.');
    } catch (error) {
        e.target.value = '';
        statusProduto(error.message + ' A foto anterior foi mantida.');
    } finally {
        processandoFoto = false;
        bloquearEditor(false);
    }
});

function limparEditorProduto() {
    produtoEmEdicao = null;
    novoProdutoRef = null;
    fotoEmEdicao = null;
    precoFinalEditadoManualmente = false;
    document.getElementById('prodDescricao').value = '';
    document.getElementById('prodCusto').value = '';
    document.getElementById('prodEstoque').value = '0';
    document.getElementById('prodFoto').value = '';
    document.getElementById('imgPreview').removeAttribute('src');
    document.getElementById('imgPreview').style.display = 'none';
    document.getElementById('textoPreview').style.display = 'block';
    document.getElementById('textoPreview').textContent = 'Nenhuma imagem selecionada';
    document.getElementById('btnCancelar').style.display = 'none';
    document.getElementById('btnSalvarProduto').textContent = 'Salvar produto';
    calcularPrecoFinal();
    document.getElementById('prodPrecoFinal').value = '';
}

document.getElementById('btnSalvarProduto').addEventListener('click', async () => {
    if (salvandoProduto || processandoFoto) return;
    const descricao = document.getElementById('prodDescricao').value.trim();
    const custo = Number(document.getElementById('prodCusto').value);
    const estoque = Number(document.getElementById('prodEstoque').value);
    if (!descricao || descricao.length > 300 || !Number.isFinite(custo) || custo <= 0) {
        statusProduto('Informe uma descrição de até 300 caracteres e um custo maior que zero.');
        return;
    }
    if (!Number.isSafeInteger(estoque) || estoque < 0) {
        statusProduto('Informe uma quantidade inteira de estoque, igual ou maior que zero.');
        return;
    }
    const precoSugerido = calcularPrecoFinal();
    const precoFinal = Number(document.getElementById('prodPrecoFinal').value);
    if (!Number.isFinite(precoFinal) || precoFinal <= 0) {
        statusProduto('Informe um preço de venda maior que zero.');
        return;
    }
    salvandoProduto = true;
    bloquearEditor(true);
    statusProduto('Salvando produto…');
    const editando = Boolean(produtoEmEdicao);
    try {
        const dados = { descricao, custo, estoque, embalagem: 9, categoria: document.getElementById('prodCategoria').value || 'itens', precoSugerido, precoFinal, updatedAt: new Date() };
        // An unchanged photo is omitted from the update so the saved photo stays intact.
        if (fotoEmEdicao !== null) dados.foto = fotoEmEdicao;
        if (editando) {
            await updateDoc(doc(db, 'produtos', produtoEmEdicao), dados);
        } else {
            novoProdutoRef ||= doc(produtosRef);
            await setDoc(novoProdutoRef, { ...dados, foto: fotoEmEdicao, createdAt: new Date() });
        }
        limparEditorProduto();
        statusProduto(editando ? 'Alterações salvas. A foto foi preservada ou atualizada conforme sua escolha.' : 'Produto cadastrado. Você já pode adicionar o próximo.');
    } catch (error) {
        statusProduto('Não foi possível salvar. Seus campos e a foto foram mantidos; tente novamente. ' + error.message);
    } finally {
        salvandoProduto = false;
        bloquearEditor(false);
    }
});

document.getElementById('btnCancelar').addEventListener('click', () => {
    if (salvandoProduto || processandoFoto) return;
    limparEditorProduto();
    statusProduto('Edição cancelada.');
});

window.excluirPedido = async (id) => { if (confirm('Excluir da nuvem?')) await deleteDoc(doc(db, 'pedidos', id)); };

window.enviarWhatsApp = (id) => {
    const pedido = pedidosCache.find(x => x.id === id);
    if (!pedido) return alert('Não foi possível carregar os detalhes do pedido.');
    let texto = `*Vênus Joias — Resumo do Pedido*\n\n*Cliente:* ${pedido.cliente}\n*Data:* ${pedido.data}\n\n`;
    pedido.itens.forEach(i => texto += `• ${i.qtd}x ${i.nome} — ${moeda.format(i.total)}\n`);
    texto += `\n*Total geral:* ${moeda.format(pedido.totalGeral)}\n\nAgradecemos a preferência!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
};

window.editarProduto = (id) => {
    const produto = produtosCache.find(p => p.id === id);
    if (!produto) return;
    if (salvandoProduto || processandoFoto) return;
    produtoEmEdicao = id;
    novoProdutoRef = null;
    document.getElementById('prodFoto').value = '';
    statusProduto('Editando produto. A foto atual será mantida.');

    // Leva o usu�rio ao topo para ver o formul�rio de edi��o
    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.getElementById('prodDescricao').value = produto.descricao;
    document.getElementById('prodCusto').value = produto.custo;
    const catEl = document.getElementById('prodCategoria');
    if (catEl) {
        const categoria = produto.categoria || 'itens';
        if (![...catEl.options].some(o => o.value === categoria)) catEl.add(new Option(categoria, categoria));
        catEl.value = categoria;
    }
    const pfEl = document.getElementById('prodPrecoFinal');
    if (pfEl) pfEl.value = (produto.precoFinal ?? '').toString();
    const estEl = document.getElementById('prodEstoque');
    if (estEl) estEl.value = String(parseInt(produto.estoque ?? 0, 10) || 0);
    precoFinalEditadoManualmente = true;
    if (produto.foto) {
        document.getElementById('imgPreview').src = produto.foto;
        document.getElementById('imgPreview').style.display = 'block';
        document.getElementById('textoPreview').style.display = 'none';
    } else {
        document.getElementById('imgPreview').style.display = 'none';
        document.getElementById('textoPreview').style.display = 'block';
        document.getElementById('textoPreview').textContent = 'Nenhuma imagem selecionada';
    }
    fotoEmEdicao = null;
    document.getElementById('btnCancelar').style.display = 'inline-block';
    document.getElementById('btnSalvarProduto').textContent = 'Salvar alterações';
    calcularPrecoFinal();

    // Ajuda a deixar claro que o formul�rio est� em edi��o
    document.getElementById('prodDescricao')?.focus?.();
};

window.excluirProduto = async (id) => { if (confirm('Tem certeza que deseja excluir este produto?')) await deleteDoc(doc(db, 'produtos', id)); };

function configurarAbas() {
    document.querySelectorAll('.aba-nav').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const abaClicada = e.target.dataset.aba;
            document.querySelectorAll('.aba-nav').forEach(b => b.classList.remove('aba-ativa'));
            document.querySelectorAll('.aba-conteudo').forEach(aba => aba.style.display = 'none');
            const abaSelecionada = document.getElementById(`aba-${abaClicada}`);
            if (abaSelecionada) abaSelecionada.style.display = 'block';
            e.target.classList.add('aba-ativa');
        });
    });
}

configurarAbas();

// Integra??o: ao escolher um produto cadastrado, preenche o valor unit?rio
document.getElementById('itemNome')?.addEventListener('input', () => {
    const nome = (document.getElementById('itemNome').value || '').trim();
    if (!nome) return;
    const produto = produtosCache.find(p => (p.descricao || '').trim().toLowerCase() === nome.toLowerCase());
    if (!produto) return;
    const valor = Number(produto.precoFinal ?? 0);
    if (valor > 0) document.getElementById('itemValor').value = valor.toFixed(2);
});
