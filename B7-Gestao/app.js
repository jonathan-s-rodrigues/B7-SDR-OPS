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
    "Ana", "Matheus Charles", "Matheus Angelo", "Manuella Soares", "Manuela Barbosa", "Junior", "Gustavo"
];

const PRODUTOS_B7 = [
    { nome: "MBA Investments & Asset Allocation", valor: 17997 },
    { nome: "MBA Wealth Management", valor: 29997 },
    { nome: "MBA Business & Financial Services", valor: 14997 },
    { nome: "MBA Middle Market & Corporate Banking", valor: 29997},
    { nome: "MBA Private Banking & Offshore", valor: 70000 },
    { nome: "Formação Especialista em Investimentos", valor: 9997},
    { nome: "Formação Gerente PJ", valor: 9997 }
];

let listaReunioes = [];
let listaBonus = []; // Agora armazena objetos com {id, desc, val}

// ==========================================
// 3. AUTENTICAÇÃO EM NUVEM (AUTH)
// ==========================================
auth.onAuthStateChanged((user) => {
    if (user) {
        abrirSistema(user);
    } else {
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }
});

function abrirSistema(user) {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    
    if (user && user.email) {
        document.getElementById('user-display-name').innerText = user.email.split('@')[0].toUpperCase();
    }
    
    try {
        iniciarSyncNuvem();
        carregarBonus();
    } catch (erro) {
        console.error("Erro ao sincronizar com Firestore:", erro);
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
            abrirSistema(credencial.user);
        })
        .catch(error => {
            errDiv.style.display = 'block';
            errDiv.innerText = "Erro ao entrar: Verifique seu e-mail e senha.";
        });
}

function realizarLogout() {
    auth.signOut();
}

// ==========================================
// 4. BANCO DE DADOS EM TEMPO REAL (FIRESTORE)
// ==========================================
function iniciarSyncNuvem() {
    db.collection("reunioes_b7").onSnapshot((snapshot) => {
        listaReunioes = [];
        snapshot.forEach((doc) => {
            listaReunioes.push({ id: doc.id, ...doc.data() });
        });
        renderizarTudo();
    });
}

function carregarBonus() {
    db.collection("bonus_sdr").onSnapshot((snapshot) => {
        listaBonus = [];
        let total = 0;
        snapshot.forEach((doc) => {
            const data = doc.data();
            listaBonus.push({ id: doc.id, desc: data.desc, val: data.val });
            total += parseFloat(data.val || 0);
        });
        atualizarUIBonus(total);
        calcularDashboard();
    });
}

// ==========================================
// 5. CONTROLE DOS MODAIS (AGENDAMENTO & BÔNUS)
// ==========================================
function abrirModalReuniao(isEdicao = false) {
    document.getElementById('modal-reuniao-title').innerText = isEdicao ? "Editar Reunião" : "Novo Agendamento";
    if (!isEdicao) {
        limparFormReuniao();
        document.getElementById('reuniao-data').value = new Date().toISOString().split('T')[0];
    }
    renderizarProdutos();
    calcularRoteamentoInteligente();
    document.getElementById('modal-reuniao').style.display = 'flex';
}

function fecharModalReuniao() {
    document.getElementById('modal-reuniao').style.display = 'none';
    limparFormReuniao();
}

function abrirModalBonus() {
    renderizarListaBonusModal();
    document.getElementById('modal-bonus').style.display = 'flex';
}

function fecharModalBonus() {
    document.getElementById('modal-bonus').style.display = 'none';
}

function adicionarBonus(e) {
    e.preventDefault();
    const desc = document.getElementById('novo-bonus-desc').value.trim();
    const val = parseFloat(document.getElementById('novo-bonus-val').value);
    
    if (desc && val) {
        db.collection("bonus_sdr").add({ desc: desc, val: val }).then(() => {
            document.getElementById('novo-bonus-desc').value = "";
            document.getElementById('novo-bonus-val').value = "";
        });
    }
}

function removerBonus(id) {
    db.collection("bonus_sdr").doc(id).delete();
}

function renderizarListaBonusModal() {
    const container = document.getElementById('lista-bonus-container');
    container.innerHTML = "";
    
    let total = 0;
    
    if (listaBonus.length === 0) {
        container.innerHTML = `<span class="text-muted text-center text-sm" style="padding: 15px;">Nenhum bônus ativo cadastrado.</span>`;
    } else {
        listaBonus.forEach(b => {
            total += b.val;
            container.innerHTML += `
                <div class="bonus-item">
                    <div>
                        <div style="font-weight: 600; color: var(--text-main);">${b.desc}</div>
                        <div style="font-size: 0.75rem; color: var(--success-light);">R$ ${b.val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                    </div>
                    <button type="button" class="btn-icon del" onclick="removerBonus('${b.id}')">🗑️</button>
                </div>
            `;
        });
    }
    
    document.getElementById('modal-bonus-total-preview').innerText = `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

function atualizarUIBonus(totalVal) {
    document.getElementById('val-bonus-display').innerText = totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

// ==========================================
// 6. ROTEAMENTO INTELIGENTE DE CLOSERS
// ==========================================
function calcularRoteamentoInteligente() {
    const dataSelecionada = document.getElementById('reuniao-data').value || new Date().toISOString().split('T')[0];
    const infoData = getDatesInfo(dataSelecionada);
    
    let scores = CLOSERS_B7.map(closerNome => {
        let vendasConvertidas = 0;
        let agendamentosNaSemana = 0;

        listaReunioes.forEach(r => {
            if (r.closer === closerNome) {
                if (r.status === "Venda feita" && getDatesInfo(r.dataVenda || r.data).isMes) {
                    vendasConvertidas++;
                }
                if (r.status !== "Cancelada" && getDatesInfo(r.data).isSemana === infoData.isSemana) {
                    agendamentosNaSemana++;
                }
            }
        });

        const scoreFinal = (vendasConvertidas * 10) - (agendamentosNaSemana * 2);
        return { nome: closerNome, score: scoreFinal, vendas: vendasConvertidas, carga: agendamentosNaSemana };
    });

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
// 7. INTERFACE E CONTROLES GERAIS
// ==========================================
function renderizarTudo() {
    renderizarProdutos();
    calcularRoteamentoInteligente();
    renderizarTabela();
    calcularDashboard();
    if (document.getElementById('modal-bonus').style.display === 'flex') {
        renderizarListaBonusModal();
    }
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
// 8. CRUD DE REUNIÕES (FIREBASE STORE)
// ==========================================
function salvarReuniao(e) {
    e.preventDefault();
    const id = document.getElementById('reuniao-id').value;
    
    const dadosReuniao = {
        leadNome: document.getElementById('lead-nome').value.trim(),
        leadEmail: document.getElementById('lead-email').value.trim(),
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

    fecharModalReuniao();
}

function editarReuniao(id) {
    const r = listaReunioes.find(item => item.id === id);
    if (!r) return;

    abrirModalReuniao(true);
    
    document.getElementById('reuniao-id').value = r.id;
    document.getElementById('lead-nome').value = r.leadNome || "";
    document.getElementById('lead-email').value = r.leadEmail || "";
    document.getElementById('lead-temp').value = r.leadTemp || "Morno";
    document.getElementById('reuniao-data').value = r.data || "";
    document.getElementById('reuniao-closer').value = r.closer || "";
    document.getElementById('reuniao-produto').value = r.produto || "";
    document.getElementById('reuniao-valor').value = r.valor || 0;
    document.getElementById('reuniao-status').value = r.status || "Agendada";
    
    toggleDataVenda();
    if (r.dataVenda) document.getElementById('venda-data').value = r.dataVenda;
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
}

function renderizarTabela() {
    const tbody = document.getElementById('lista-reunioes');
    tbody.innerHTML = '';
    
    const sorted = [...listaReunioes].sort((a, b) => new Date(b.data) - new Date(a.data));
    document.getElementById('total-registros').innerText = `${sorted.length} registros`;

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted" style="padding:40px;">Nenhuma reunião agendada. Clique em "+ Novo Agendamento" para começar!</td></tr>`;
        return;
    }

    sorted.forEach(r => {
        const dataCall = r.data ? r.data.split('-').reverse().join('/') : '-';
        const dataVd = r.dataVenda ? r.dataVenda.split('-').reverse().join('/') : '—';
        const valFmt = (r.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const emailExibido = r.leadEmail || "Sem e-mail cadastrado";
        
        tbody.innerHTML += `
            <tr>
                <td>
                    <div style="font-weight:600; font-size: 0.9rem; color: var(--text-main);">${r.leadNome}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${emailExibido}</div>
                </td>
                <td><span class="tag-temp temp-${r.leadTemp}">${r.leadTemp || 'Morno'}</span></td>
                <td style="font-weight:500;">${dataCall}</td>
                
                <!-- NOVO VISUAL DO CLOSER: Limpo, sem caixa preta e com ícone destacado -->
                <td>
                    <div style="display: flex; align-items: center; gap: 6px; font-weight: 500; color: var(--text-main); font-size: 0.85rem;">
                        <span style="color: var(--accent); font-size: 0.95rem;">👤</span> ${r.closer}
                    </div>
                </td>

                <td style="font-weight: 500; color: var(--text-main);">${r.produto}</td>
                <td style="font-weight: 600; color: var(--accent);">R$ ${valFmt}</td>
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
// 9. CÁLCULO DE DATAS E DASHBOARD SINCRONIZADO
// ==========================================
function getDatesInfo(dateStr) {
    if (!dateStr) return { isHoje: false, isSemana: false, isMes: false };
    
    // Converte de forma precisa sem interferência de fuso horário
    const partes = dateStr.split('-');
    const d = new Date(partes[0], partes[1] - 1, partes[2]);
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const isHoje = d.getTime() === hoje.getTime();

    // Domingo da semana atual até Sábado
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
        
        // Agendamentos (Contabiliza para todas as metas de esforço do SDR)
        if (r.status !== "Cancelada") {
            if (dCall.isHoje) diaAg++;
            if (dCall.isSemana) semAg++;
            if (dCall.isMes) mesAg++;
        }

        // Realizadas
        if (r.status === "Realizada" || r.status === "Venda feita") {
            if (dCall.isHoje) diaRe++;
            if (dCall.isSemana) semRe++;
            if (dCall.isMes) mesRe++;
        }

        // Faturamento e Comissão (Com base na data de fechamento da venda)
        if (r.status === "Venda feita") {
            const dVenda = getDatesInfo(r.dataVenda || r.data);
            if (dVenda.isMes) {
                faturamentoMes += (r.valor || 0);
                comissaoVendas += (r.valor || 0) * 0.0075;
            }
        }
    });

    // Calcula total da comissão (Vendas + Soma de todos os bônus ativos)
    let totalBonusVal = listaBonus.reduce((acc, item) => acc + item.val, 0);
    const comissaoTotal = comissaoVendas + totalBonusVal;

    // Atualiza KPIs Topo
    document.getElementById('dash-comissao-total').innerText = `R$ ${comissaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('dash-faturamento').innerText = `R$ ${faturamentoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    const pctVendas = Math.min((faturamentoMes / 600000) * 100, 100).toFixed(1);
    document.getElementById('dash-pct-vendas').innerText = `${pctVendas}% da meta mensal`;
    document.getElementById('bar-faturamento').style.width = `${pctVendas}%`;

    // Atualiza Metas Diárias com Barras e Porcentagens
    document.getElementById('dia-ag').innerText = diaAg;
    document.getElementById('dia-re').innerText = diaRe;
    const pctDiaAg = Math.min((diaAg / 12) * 100, 100).toFixed(0);
    const pctDiaRe = Math.min((diaRe / 6) * 100, 100).toFixed(0);
    document.getElementById('pct-dia-ag').innerText = `${pctDiaAg}%`;
    document.getElementById('pct-dia-re').innerText = `${pctDiaRe}%`;
    document.getElementById('bar-dia-ag').style.width = `${pctDiaAg}%`;
    document.getElementById('bar-dia-re').style.width = `${pctDiaRe}%`;

    // Atualiza Metas Semanais com Barras e Porcentagens
    document.getElementById('sem-ag').innerText = semAg;
    document.getElementById('sem-re').innerText = semRe;
    const pctSemAg = Math.min((semAg / 60) * 100, 100).toFixed(0);
    const pctSemRe = Math.min((semRe / 30) * 100, 100).toFixed(0);
    document.getElementById('pct-sem-ag').innerText = `${pctSemAg}%`;
    document.getElementById('pct-sem-re').innerText = `${pctSemRe}%`;
    document.getElementById('bar-sem-ag').style.width = `${pctSemAg}%`;
    document.getElementById('bar-sem-re').style.width = `${pctSemRe}%`;

    // Atualiza Metas Mensais com Barras e Porcentagens
    document.getElementById('mes-ag').innerText = mesAg;
    document.getElementById('mes-re').innerText = mesRe;
    const pctMesAg = Math.min((mesAg / 240) * 100, 100).toFixed(0);
    const pctMesRe = Math.min((mesRe / 100) * 100, 100).toFixed(0);
    document.getElementById('pct-mes-ag').innerText = `${pctMesAg}%`;
    document.getElementById('pct-mes-re').innerText = `${pctMesRe}%`;
    document.getElementById('bar-mes-ag').style.width = `${pctMesAg}%`;
    document.getElementById('bar-mes-re').style.width = `${pctMesRe}%`;

    // Validador do Gatilho da Comissão (100 Realizadas)
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