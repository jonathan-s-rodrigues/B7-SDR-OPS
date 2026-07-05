import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

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

function loga(msg) { console.log(msg); }

const btnLogar = document.getElementById('btnLogar');
const btnCriarConta = document.getElementById('btnCriarConta');

if (btnLogar) btnLogar.addEventListener('click', fazerLogin);
if (btnCriarConta) btnCriarConta.addEventListener('click', criarContaTeste);

function fazerLogin() {
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;
    const erroTxt = document.getElementById('login-erro');

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

function criarContaTeste() {
    const email = 'teste@venusjoias.com';
    const senha = 'teste123';
    const erroTxt = document.getElementById('login-erro');

    createUserWithEmailAndPassword(auth, email, senha)
        .then((userCredential) => {
            loga('Conta criada: ' + userCredential.user.email);
            erroTxt.style.display = 'block';
            erroTxt.style.color = 'green';
            erroTxt.innerText = 'Conta criada! Use: teste@venusjoias.com / teste123';
        })
        .catch((error) => {
            loga('Erro ao criar conta: ' + error.message);
            erroTxt.style.display = 'block';
            erroTxt.style.color = 'red';
            erroTxt.innerText = 'Erro ao criar conta: ' + error.message;
        });
}

document.getElementById('btnSair').onclick = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    const overlay = document.getElementById('login-overlay');
    const btnSair = document.getElementById('btnSair');

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
        container.innerHTML = pedidosCache.map(p => `
            <div class="pedido-salvo">
                <div class="pedido-header"><span>Cliente: ${p.cliente}</span><span>${p.data}</span></div>
                ${p.itens.map(i => `<div class="pedido-item"><span>${i.nome}</span><span>${i.qtd}x</span><span>R$ ${i.total.toFixed(2)}</span></div>`).join('')}
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
    onSnapshot(query(produtosRef, orderBy('createdAt', 'desc')), (snapshot) => {
        produtosCache = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
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
    container.innerHTML = produtosCache.map(produto => `
        <div class="produto-card">
            ${produto.foto ? `<img src="${produto.foto}" alt="${produto.descricao}" class="produto-foto">` : '<div class="produto-foto" style="display:flex;align-items:center;justify-content:center;color:#ccc;">Sem foto</div>'}
            <div class="produto-descricao">${produto.descricao}</div>
            <div class="produto-preco">
                <div style="margin-bottom:5px;">Categoria: <strong>${(produto.categoria || 'itens')}</strong></div>
                <div style="margin-bottom:5px;">Estoque: <strong>${parseInt(produto.estoque ?? 0, 10) || 0}</strong></div>
                <div style="margin-bottom:5px;">Custo: <span class="custo">R$ ${Number(produto.custo || 0).toFixed(2)}</span></div>
                <div style="margin-bottom:5px;">Sugerido: R$ ${Number((produto.precoSugerido ?? produto.precoFinal) || 0).toFixed(2)}</div>
                <div>Pre?o final: <span class="final">R$ ${Number(produto.precoFinal || 0).toFixed(2)}</span></div>
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

document.getElementById('prodFoto').addEventListener('change', (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    if (arquivo.size > 1024 * 1024) {
        alert('A imagem deve ter no m?ximo 1MB!');
        document.getElementById('prodFoto').value = '';
        return;
    }
    const leitor = new FileReader();
    leitor.onload = (evento) => {
        document.getElementById('imgPreview').src = evento.target.result;
        document.getElementById('imgPreview').style.display = 'block';
        document.getElementById('textoPreview').style.display = 'none';
        fotoEmEdicao = evento.target.result;
    };
    leitor.readAsDataURL(arquivo);
});

document.getElementById('btnSalvarProduto').addEventListener('click', async () => {
    try {
        const descricao = document.getElementById('prodDescricao').value;
        const custo = parseFloat(document.getElementById('prodCusto').value);
        const embalagem = 9.00;
        if (!descricao || isNaN(custo) || custo <= 0) return alert('Preencha pelo menos a descri??o e o custo do produto!');

        let foto = fotoEmEdicao || null;
        const categoria = document.getElementById('prodCategoria')?.value || 'itens';
        const precoSugerido = calcularPrecoFinal();
        const precoFinalDigitado = parseFloat(document.getElementById('prodPrecoFinal')?.value);
        const precoFinal = !isNaN(precoFinalDigitado) && precoFinalDigitado > 0 ? precoFinalDigitado : precoSugerido;
        const estoqueDigitado = parseInt(document.getElementById('prodEstoque')?.value ?? '0', 10);
        const estoque = Number.isFinite(estoqueDigitado) && estoqueDigitado >= 0 ? estoqueDigitado : 0;

        if (produtoEmEdicao) {
            await updateDoc(doc(db, 'produtos', produtoEmEdicao), { descricao, categoria, custo, embalagem, foto, precoSugerido, precoFinal, estoque, updatedAt: new Date() });
            produtoEmEdicao = null;
            document.getElementById('btnCancelar').style.display = 'none';
        } else {
            await addDoc(produtosRef, { descricao, categoria, custo, embalagem, foto, precoSugerido, precoFinal, estoque, createdAt: new Date() });
        }

        document.getElementById('prodDescricao').value = '';
        document.getElementById('prodCusto').value = '';
        const catEl = document.getElementById('prodCategoria');
        if (catEl) catEl.value = 'pulseiras';
        const pfEl = document.getElementById('prodPrecoFinal');
        if (pfEl) pfEl.value = '';
        const estEl = document.getElementById('prodEstoque');
        if (estEl) estEl.value = '0';
        document.getElementById('prodFoto').value = '';
        document.getElementById('imgPreview').style.display = 'none';
        document.getElementById('textoPreview').style.display = 'block';
        document.getElementById('textoPreview').textContent = 'Nenhuma imagem selecionada';
        precoFinalEditadoManualmente = false;
        calcularPrecoFinal();

    } catch (error) {
        alert('Erro ao salvar produto: ' + error.message);
    }
});

document.getElementById('btnCancelar').addEventListener('click', () => {
    produtoEmEdicao = null;
    document.getElementById('prodDescricao').value = '';
    document.getElementById('prodCusto').value = '';
    const catEl = document.getElementById('prodCategoria');
    if (catEl) catEl.value = 'pulseiras';
    const pfEl = document.getElementById('prodPrecoFinal');
    if (pfEl) pfEl.value = '';
    const estEl = document.getElementById('prodEstoque');
    if (estEl) estEl.value = '0';
    document.getElementById('prodFoto').value = '';
    document.getElementById('imgPreview').style.display = 'none';
    document.getElementById('textoPreview').style.display = 'block';
    document.getElementById('textoPreview').textContent = 'Nenhuma imagem selecionada';
    document.getElementById('btnCancelar').style.display = 'none';
    document.getElementById('btnSalvarProduto').textContent = '?? Salvar Produto';
    fotoEmEdicao = null;
    precoFinalEditadoManualmente = false;
    calcularPrecoFinal();
});

window.excluirPedido = async (id) => { if (confirm('Excluir da nuvem?')) await deleteDoc(doc(db, 'pedidos', id)); };

window.enviarWhatsApp = (id) => {
    const pedido = pedidosCache.find(x => x.id === id);
    if (!pedido) return alert('Ops! N?o foi poss?vel carregar os detalhes do pedido.');
    let texto = `*V?nus Joias � Resumo do Pedido*\n\n*Cliente:* ${pedido.cliente}\n*Data:* ${pedido.data}\n\n`;
    pedido.itens.forEach(i => texto += `� ${i.qtd}x ${i.nome} � R$ ${i.total.toFixed(2)}\n`);
    texto += `\n*Total geral:* R$ ${pedido.totalGeral.toFixed(2)}\n\nAgradecemos a prefer?ncia!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
};

window.editarProduto = (id) => {
    const produto = produtosCache.find(p => p.id === id);
    if (!produto) return;
    produtoEmEdicao = id;

    // Leva o usu�rio ao topo para ver o formul�rio de edi��o
    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.getElementById('prodDescricao').value = produto.descricao;
    document.getElementById('prodCusto').value = produto.custo;
    const catEl = document.getElementById('prodCategoria');
    if (catEl) catEl.value = produto.categoria || 'pulseiras';
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
    document.getElementById('btnSalvarProduto').textContent = '?? Atualizar Produto';
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


