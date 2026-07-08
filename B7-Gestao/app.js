// ==========================================
// 1. CONFIGURAÇÃO E INICIALIZAÇÃO FIREBASE
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyDLuqrwt64cR9EbernPwnTeyUii70CFHwQ",
  authDomain: "b7-sdr-crm.firebaseapp.com",
  projectId: "b7-sdr-crm",
  storageBucket: "b7-sdr-crm.firebasestorage.app",
  messagingSenderId: "226466022951",
  appId: "1:226466022951:web:136a65e6aaa01d73f13002",
  measurementId: "G-YRGDT4SNM1"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ==========================================
// 2. DADOS FIXOS DO NEGÓCIO (B7 BUSINESS)
// ==========================================
const CLOSERS_B7 = [
    "Alexandre Closer", "Beatriz Closer", "Carlos Closer", "Daniela Closer", 
    "Eduardo Closer", "Fernanda Closer", "Gabriel Closer", "Helena Closer", 
    "Igor Closer", "Julia Closer"
];

const PRODUTOS_B7 = [
    { nome: "MBA Investments & Asset Allocation", valor: 18000 },
    { nome: "MBA Wealth Management", valor: 20000 },
    { nome: "MBA Business & Financial Services", valor: 16000 },
    { nome: "MBA Middle Market & Corporate Banking", valor: 22000 },
    { nome: "MBA Private Banking & Offshore", valor: 25000 },
    { nome: "Formação Especialista em Investimentos", valor: 8000 },
    { nome: "Formação PJ", valor: 7500 }
];

let listaReunioes = [];
let bonusAcumulado = 0;

// ==========================================
// 3. AUTENTICAÇÃO EM NUVEM (AUTH)
// ==========================================
// ==========================================
// 3. AUTENTICAÇÃO EM NUVEM (AUTH) - BLINDADO
// ==========================================
auth.onAuthStateChanged((user) => {
    if (user) {
        // Se já detectou que está logado, fecha a tela imediatamente
        abrirSistema(user);
    } else {
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }
});

function abrirSistema(user) {
    // 1. Força a tela de login a sumir
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    
    // 2. Coloca o nome do usuário na barra lateral
    if (user && user.email) {
        document.getElementById('user-display-name').innerText = user.email.split('@')[0].toUpperCase();
    }
    
    // 3. Tenta conectar ao banco com proteção (Se der erro no Firestore, o app não trava)
    try {
        iniciarSyncNuvem();
        carregarBonus();
    } catch (erro) {
        console.error("Erro ao sincronizar com Firestore:", erro);
        alert("Você está conectada, mas houve um problema ao ler o banco de dados. Verifique o Passo 1 das Regras no Firebase!");
    }
}

function realizarLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const errDiv = document.getElementById('login-error');
    
    errDiv.style.display = 'none';
    
    auth.signInWithEmailAndPassword(email, pass)
        .then((credencial) => {
            // Sucesso no login! Força a abertura do sistema imediatamente
            abrirSistema(credencial.user);
        })
        .catch(error => {
            errDiv.style.display = 'block';
            errDiv.innerText = "Erro ao entrar: Verifique seu e-mail e senha.";
            console.error("Detalhe do erro:", error);
        });
}

function realizarLogout() {
    auth.signOut();
}

// ==========================================
// 4. BANCO DE DADOS EM TEMPO REAL (FIRESTORE)
// ==========================================
function iniciarSyncNuvem() {
    // Sincroniza reuniões em tempo real para as 2 SDRs
    db.collection("reunioes_b7").onSnapshot((snapshot) => {
        listaReunioes = [];
        snapshot.forEach((doc) => {
            listaReunioes.push({ id: doc.id, ...doc.data() });
        });
        
        renderizarTudo();
    });
}

function carregarBonus() {
    db.collection("config_sdr").doc("premiacoes").get().then((doc) => {
        if (doc.exists && doc.data().valor) {
            bonusAcumulado = parseFloat(doc.data().valor);
        } else {
            bonusAcumulado = 0;
        }
        atualizarUIBonus();
        calcularDashboard();
    });
}

// ==========================================
// 5. ROTEAMENTO INTELIGENTE DE CLOSERS
// ==========================================
function calcularRoteamentoInteligente() {
    const dataSelecionada = document.getElementById('reuniao-data').value || new Date().toISOString().split('T')[0];
    const infoData = getDatesInfo(dataSelecionada);
    
    let scores = CLOSERS_B7.map(closerNome => {
        let vendasConvertidas = 0;
        let agendamentosNaSemana = 0;

        listaReunioes.forEach(r => {
            if (r.closer === closerNome) {
                // Conta vendas convertidas no mês
                if (r.status === "Venda feita" && getDatesInfo(r.dataVenda || r.data).isMes) {
                    vendasConvertidas++;
                }
                // Conta carga de reuniões agendadas na mesma semana do agendamento
                if (r.status !== "Cancelada" && getDatesInfo(r.data).isSemana === infoData.isSemana) {
                    agendamentosNaSemana++;
                }
            }
        });

        // FÓRMULA DO ROTEAMENTO: (Vendas * 10) - (Carga na Semana * 2)
        const scoreFinal = (vendasConvertidas * 10) - (agendamentosNaSemana * 2);
        return { nome: closerNome, score: scoreFinal, vendas: vendasConvertidas, carga: agendamentosNaSemana };
    });

    // Ordena do maior score (melhor opção) para o menor
    scores.sort((a, b) => b.score - a.score);
    
    const select = document.getElementById('reuniao-closer');
    const valorAtual = select.value;
    select.innerHTML = '<option value="">Selecione o Closer...</option>';
    
    scores.forEach((c, idx) => {
        const tagRecomendado = idx === 0 ? " ⭐ RECOMENDADO" : "";
        const label = `${c.nome}${tagRecomendado} (Score: ${c.score} | Vendas: ${c.vendas} | Carga Sem.: ${c.carga})`;
        select.innerHTML += `<option value="${c.nome}" ${c.nome === valorAtual ? 'selected' : ''}>${label}</option>`;
    });

    if (scores.length > 0) {
        document.getElementById('routing-tip').innerText = `Prioridade atual: ${scores[0].nome}`;
    }
}

// ==========================================
// 6. INTERFACE E CONTROLES DE FORMULÁRIO
// ==========================================
function renderizarTudo() {
    renderizarProdutos();
    calcularRoteamentoInteligente();
    renderizarTabela();
    calcularDashboard();
}

function switchView(viewName, element) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${viewName}`).classList.add('active');
    if(element) element.classList.add('active');
}

function toggleDataVenda() {
    const status = document.getElementById('reuniao-status').value;
    const group = document.getElementById('group-data-venda');
    const input = document.getElementById('venda-data');
    
    if (status === "Venda feita") {
        group.style.display = "flex";
        if (!input.value) input.value = new Date().toISOString().split('T')[0];
    } else {
        group.style.display = "none";
        input.value = "";
    }
}

function renderizarProdutos() {
    const pSelect = document.getElementById('reuniao-produto');
    const prodAtual = pSelect.value;
    pSelect.innerHTML = '<option value="">Selecione o Programa...</option>';
    
    PRODUTOS_B7.forEach(p => {
        pSelect.innerHTML += `<option value="${p.nome}" data-val="${p.valor}" ${p.nome === prodAtual ? 'selected' : ''}>${p.nome} — R$ ${p.valor.toLocaleString('pt-BR')}</option>`;
    });
}

function atualizarValorProduto() {
    const select = document.getElementById('reuniao-produto');
    const opt = select.options[select.selectedIndex];
    if (opt.value) {
        document.getElementById('reuniao-valor').value = opt.getAttribute('data-val');
    }
}

// ==========================================
// 7. CRUD DE REUNIÕES (FIREBASE STORE)
// ==========================================
function salvarReuniao(e) {
    e.preventDefault();
    const id = document.getElementById('reuniao-id').value;
    
    const dadosReuniao = {
        leadNome: document.getElementById('lead-nome').value.trim(),
        leadTemp: document.getElementById('lead-temp').value,
        data: document.getElementById('reuniao-data').value,
        closer: document.getElementById('reuniao-closer').value,
        produto: document.getElementById('reuniao-produto').value,
        valor: parseFloat(document.getElementById('reuniao-valor').value) || 0,
        status: document.getElementById('reuniao-status').value,
        dataVenda: document.getElementById('venda-data').value || null,
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (id) {
        db.collection("reunioes_b7").doc(id).update(dadosReuniao);
    } else {
        db.collection("reunioes_b7").add(dadosReuniao);
    }

    limparFormReuniao();
}

function editarReuniao(id) {
    const r = listaReunioes.find(item => item.id === id);
    if (!r) return;

    document.getElementById('reuniao-id').value = r.id;
    document.getElementById('lead-nome').value = r.leadNome;
    document.getElementById('lead-temp').value = r.leadTemp || "Morno";
    document.getElementById('reuniao-data').value = r.data;
    document.getElementById('reuniao-closer').value = r.closer;
    document.getElementById('reuniao-produto').value = r.produto;
    document.getElementById('reuniao-valor').value = r.valor;
    document.getElementById('reuniao-status').value = r.status;
    
    toggleDataVenda();
    if (r.dataVenda) document.getElementById('venda-data').value = r.dataVenda;
    
    document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth' });
}

function deletarReuniao(id) {
    if (confirm("Remover este lead definitivamente da nuvem?")) {
        db.collection("reunioes_b7").doc(id).delete();
    }
}

function limparFormReuniao() {
    document.getElementById('form-reuniao').reset();
    document.getElementById('reuniao-id').value = "";
    toggleDataVenda();
    calcularRoteamentoInteligente();
}

function renderizarTabela() {
    const tbody = document.getElementById('lista-reunioes');
    tbody.innerHTML = '';
    
    const sorted = [...listaReunioes].sort((a, b) => new Date(b.data) - new Date(a.data));
    document.getElementById('total-registros').innerText = `${sorted.length} registros`;

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:40px;">Nenhum lead cadastrado. Adicione no formulário ao lado!</td></tr>`;
        return;
    }

    sorted.forEach(r => {
        const dataCall = r.data ? r.data.split('-').reverse().join('/') : '-';
        const dataVd = r.dataVenda ? r.dataVenda.split('-').reverse().join('/') : '—';
        const valFmt = (r.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        
        tbody.innerHTML += `
            <tr>
                <td>
                    <div style="font-weight:600;">${r.leadNome}</div>
                    <div><span class="tag-temp temp-${r.leadTemp}">${r.leadTemp || 'Morno'}</span></div>
                </td>
                <td style="font-weight:500;">${dataCall}</td>
                <td><span style="background:var(--bg-app); padding:4px 8px; border-radius:6px; border:1px solid var(--border); font-size:0.75rem;">👤 ${r.closer}</span></td>
                <td>
                    <div style="font-size:0.8rem; color:var(--text-main);">${r.produto}</div>
                    <div style="font-size:0.75rem; color:var(--accent);">R$ ${valFmt}</div>
                </td>
                <td><span class="status-${r.status.replace(/\s+/g, '')}">${r.status}</span></td>
                <td style="color:${r.dataVenda ? 'var(--success-light)' : 'var(--text-dark)'}; font-weight:${r.dataVenda ? '600' : 'normal'};">${dataVd}</td>
                <td style="text-align:right; white-space:nowrap;">
                    <button type="button" class="btn-icon" onclick="editarReuniao('${r.id}')" title="Editar">✏️</button>
                    <button type="button" class="btn-icon del" onclick="deletarReuniao('${r.id}')" title="Excluir">🗑️</button>
                </td>
            </tr>
        `;
    });
}

// ==========================================
// 8. CÁLCULO DE PERÍODOS E METAS B7
// ==========================================
function getDatesInfo(dateStr) {
    if (!dateStr) return { isHoje: false, isSemana: false, isMes: false };
    const d = new Date(dateStr + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const isHoje = d.getTime() === hoje.getTime();

    const primDia = new Date(hoje);
    primDia.setDate(hoje.getDate() - hoje.getDay());
    const ultDia = new Date(primDia);
    ultDia.setDate(primDia.getDate() + 6);
    const isSemana = d >= primDia && d <= ultDia;

    const isMes = d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();

    return { isHoje, isSemana, isMes };
}

function calcularDashboard() {
    let comissaoVendas = 0;
    let faturamentoMes = 0;

    let diaAg = 0, diaRe = 0;
    let semAg = 0, semRe = 0;
    let mesAg = 0, mesRe = 0;

    listaReunioes.forEach(r => {
        const dCall = getDatesInfo(r.data);
        
        // Contagem de Agendadas
        if (r.status !== "Cancelada") {
            if (dCall.isHoje) diaAg++;
            if (dCall.isSemana) semAg++;
            if (dCall.isMes) mesAg++;
        }

        // Contagem de Realizadas (Inclui Realizada e Venda feita)
        if (r.status === "Realizada" || r.status === "Venda feita") {
            if (dCall.isHoje) diaRe++;
            if (dCall.isSemana) semRe++;
            if (dCall.isMes) mesRe++;
        }

        // Faturamento e Comissão (Pela data do fechamento da venda)
        if (r.status === "Venda feita") {
            const dVenda = getDatesInfo(r.dataVenda || r.data);
            if (dVenda.isMes) {
                faturamentoMes += (r.valor || 0);
                comissaoVendas += (r.valor || 0) * 0.0075; // 0,75% de comissão
            }
        }
    });

    const comissaoTotal = comissaoVendas + bonusAcumulado;

    // Atualiza KPIs de Comissão e Vendas
    document.getElementById('dash-comissao-total').innerText = `R$ ${comissaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('dash-faturamento').innerText = `R$ ${faturamentoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    const pctVendas = Math.min((faturamentoMes / 600000) * 100, 100).toFixed(1);
    document.getElementById('dash-pct-vendas').innerText = `${pctVendas}% da meta mensal`;
    document.getElementById('bar-faturamento').style.width = `${pctVendas}%`;

    // Atualiza Metas de Reuniões (Diária, Semanal, Mensal)
    document.getElementById('dia-ag').innerText = diaAg;
    document.getElementById('dia-re').innerText = diaRe;
    document.getElementById('sem-ag').innerText = semAg;
    document.getElementById('sem-re').innerText = semRe;
    document.getElementById('mes-ag').innerText = mesAg;
    document.getElementById('mes-re').innerText = mesRe;

    const pctSemana = Math.min((semRe / 30) * 100, 100).toFixed(0);
    document.getElementById('bar-semana').style.width = `${pctSemana}%`;

    // Lógica de Gatilho da Comissão (Mínimo de 100 Realizadas no mês)
    const statusComissao = document.getElementById('status-comissao');
    const msgGatilho = document.getElementById('msg-gatilho');
    
    if (mesRe >= 100) {
        statusComissao.className = "badge badge-success";
        statusComissao.innerText = "🏆 COMISSÃO MENSAL ATIVADA (100+ Realizadas)";
        msgGatilho.innerText = "Gatilho atingido! Comissão liberada para pagamento.";
        msgGatilho.style.color = "var(--success-light)";
    } else {
        const faltam = 100 - mesRe;
        statusComissao.className = "badge badge-warning";
        statusComissao.innerText = `⚠️ Falta(m) ${faltam} realizada(s) para ativar comissão`;
        msgGatilho.innerText = `Meta mínima: 100 realizadas. Faltam ${faltam}.`;
        msgGatilho.style.color = "var(--text-muted)";
    }
}

// ==========================================
// 9. MODAL DE BÔNUS DE CAMPANHAS
// ==========================================
function abrirModalBonus() {
    document.getElementById('input-bonus-val').value = bonusAcumulado;
    document.getElementById('modal-bonus').style.display = 'flex';
}

function fecharModalBonus() {
    document.getElementById('modal-bonus').style.display = 'none';
}

function salvarBonus() {
    const val = parseFloat(document.getElementById('input-bonus-val').value) || 0;
    db.collection("config_sdr").doc("premiacoes").set({ valor: val }).then(() => {
        fecharModalBonus();
    });
}

function atualizarUIBonus() {
    document.getElementById('val-bonus-display').innerText = bonusAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}