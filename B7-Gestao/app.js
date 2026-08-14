// ==========================================
// 1. // FIREBASE
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
// 2. DADOS PADRÃO
// ==========================================

const PRODUTOS_B7 = [
    { nome: "MBA Investments & Asset Allocation", valor: 17997 },
  { nome: "MBA Wealth Management", valor: 29997 },
  { nome: "MBA Business & Financial Services", valor: 14997 },
  { nome: "MBA Middle Market & Corporate Banking", valor: 29997 },
  { nome: "MBA Private Banking & Offshore", valor: 70000 },
  { nome: "Formação Especialista em Investimentos", valor: 9997 },
  { nome: "Formação Gerente PJ", valor: 9997 },
];
const CONFIG_DEFAULT = {
  closers: ["Ana", "Matheus Charles", "Matheus Angelo", "Manuella Soares", "Manuela Barbosa", "Junior", "Gustavo"],
  goals: {
    dailyAg: 12, dailyRe: 6,
    weeklyAg: 60, weeklyRe: 30,
    monthlyAg: 240, monthlyRe: 100,
    salesTarget: 600000,
    minRealizadas: 100,
  },
  commissionRate: 0.0075,
};
let listaReunioes = [];
let listaBonus = [];
let config = structuredClone(CONFIG_DEFAULT);
// Navegação do dashboard
let periodType = "month";
let refDate = new Date();
refDate.setHours(0, 0, 0, 0);

// ==========================================
// 3. AUTH
// ==========================================

auth.onAuthStateChanged((user) => {
    if (user) abrirSistema(user);
  else {
    document.getElementById("login-overlay").hidden = false;
    document.getElementById("app-container").hidden = true;
  }
});

function abrirSistema(user) {
    document.getElementById("login-overlay").hidden = true;
  document.getElementById("app-container").hidden = false;
  if (user?.email) {
    document.getElementById("user-display-name").textContent = user.email.split("@")[0].toUpperCase();
  }
  iniciarSyncNuvem();
  carregarBonus();
  carregarConfig();
  wireNavigation();
  wirePeriodNav();
  wireFilters();
}

function realizarLogin(e) {
    e.preventDefault();
  const errDiv = document.getElementById("login-error");
  errDiv.hidden = true;
  auth.signInWithEmailAndPassword(
    document.getElementById("login-email").value,
    document.getElementById("login-password").value
  ).catch(() => {
    errDiv.hidden = false;
    errDiv.textContent = "E-mail ou senha incorretos.";
  });
}

function realizarLogout() { auth.signOut(); }

// ==========================================
// 4. FIRESTORE SYNC
// ==========================================

function iniciarSyncNuvem() {
  const user = auth.currentUser;
  if (!user) return; // Garante que o usuário está logado

  db.collection("reunioes_b7")
    .where("userId", "==", user.uid) // Filtra apenas as reuniões do SDR logado
    .onSnapshot((snap) => {
      listaReunioes = [];
      snap.forEach((doc) => listaReunioes.push({ id: doc.id, ...doc.data() }));
      renderizarTudo();
    });
}

function carregarBonus() {
  const user = auth.currentUser;
  if (!user) return;

  db.collection("bonus_sdr")
    .where("userId", "==", user.uid) // Filtra apenas os bônus do SDR logado
    .onSnapshot((snap) => {
      listaBonus = [];
      snap.forEach((doc) => listaBonus.push({ id: doc.id, ...doc.data() }));
      renderizarTudo();
    });
}

function carregarConfig() {
  db.collection("config_sdr").doc("settings").onSnapshot((doc) => {
    if (doc.exists) {
      const d = doc.data();
      config = {
        closers: d.closers || CONFIG_DEFAULT.closers,
        goals: { ...CONFIG_DEFAULT.goals, ...(d.goals || {}) },
        commissionRate: d.commissionRate ?? CONFIG_DEFAULT.commissionRate,
      };
    }
    renderConfigForm();
    renderizarTudo();
  });
}

function salvarConfig() {
  config.goals.salesTarget = parseFloat(document.getElementById("cfg-meta-vendas").value) || 600000;
  config.commissionRate = (parseFloat(document.getElementById("cfg-comissao").value) || 0.75) / 100;
  config.goals.minRealizadas = parseInt(document.getElementById("cfg-min-realizadas").value) || 100;

  const metaFields = [
    ["dailyAg", "cfg-daily-ag"], ["dailyRe", "cfg-daily-re"],
    ["weeklyAg", "cfg-weekly-ag"], ["weeklyRe", "cfg-weekly-re"],
    ["monthlyAg", "cfg-monthly-ag"], ["monthlyRe", "cfg-monthly-re"],
  ];
  metaFields.forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) config.goals[key] = parseInt(el.value) || CONFIG_DEFAULT.goals[key];
  });

  config.closers = [...document.querySelectorAll("#closers-config-list input")].map((i) => i.value.trim()).filter(Boolean);
  db.collection("config_sdr").doc("settings").set({
    closers: config.closers,
    goals: config.goals,
    commissionRate: config.commissionRate,
    atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
  }).then(() => alert("Configurações salvas!"));
}

// ==========================================
// 5. NAVEGAÇÃO
// ==========================================

function wireNavigation() {
  document.querySelectorAll(".nav-link").forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll(".nav-link").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`view-${btn.dataset.view}`).classList.add("active");
    };
  });
}

function wirePeriodNav() {
  document.getElementById("period-type").onchange = (e) => {
    periodType = e.target.value;
    renderizarDashboard();
  };
  document.getElementById("nav-prev").onclick = () => { navigatePeriod(-1); };
  document.getElementById("nav-next").onclick = () => { navigatePeriod(1); };
  document.getElementById("nav-today").onclick = () => {
    refDate = new Date(); refDate.setHours(0, 0, 0, 0);
    renderizarDashboard();
  };
}

function navigatePeriod(dir) {
  const d = new Date(refDate);
  if (periodType === "day") d.setDate(d.getDate() + dir);
  else if (periodType === "week") d.setDate(d.getDate() + dir * 7);
  else d.setMonth(d.getMonth() + dir);
  refDate = d;
  renderizarDashboard();
}

function wireFilters() {
  ["filtro-closer", "filtro-data-de", "filtro-data-ate", "filtro-status", "filtro-tipo"].forEach((id) => {
    document.getElementById(id).addEventListener("change", renderizarTabela);
  });
  document.getElementById("limpar-filtros").onclick = () => {
    document.getElementById("filtro-closer").value = "";
    document.getElementById("filtro-data-de").value = "";
    document.getElementById("filtro-data-ate").value = "";
    document.getElementById("filtro-status").value = "";
    document.getElementById("filtro-tipo").value = "";
    renderizarTabela();
  };
}

// ==========================================
// 6. DATAS & PERÍODOS
// ==========================================

function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtBR(date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: periodType === "month" ? "numeric" : undefined });
}

function getPeriodRange() {
  const d = new Date(refDate);
  if (periodType === "day") {
    return { from: d, to: d, label: fmtBR(d) };
  }
  if (periodType === "week") {
    const from = new Date(d);
    from.setDate(d.getDate() - d.getDay());
    const to = new Date(from);
    to.setDate(from.getDate() + 6);
    return { from, to, label: `${fmtBR(from)} — ${fmtBR(to)}` };
  }
  const from = new Date(d.getFullYear(), d.getMonth(), 1);
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return {
    from, to,
    label: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
  };
}

function inPeriod(dateStr, from, to) {
  const d = parseDate(dateStr);
  if (!d) return false;
  const f = new Date(from); f.setHours(0, 0, 0, 0);
  const t = new Date(to); t.setHours(23, 59, 59, 999);
  return d >= f && d <= t;
}

function reunioesNoPeriodo(from, to) {
  return listaReunioes.filter((r) => inPeriod(r.data, from, to));
}

function fmtMoney(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ==========================================
// 7. DASHBOARD
// ==========================================

function renderizarDashboard() {
    const { from, to, label } = getPeriodRange();
  document.getElementById("period-label").textContent = label;
    const g = config.goals;
    const items = reunioesNoPeriodo(new Date(from), new Date(to));
  let ag = 0, re = 0, noShow = 0, vendas = 0, faturamento = 0;
  items.forEach((r) => {
    if (r.status !== "Cancelada") ag++;
    if (r.status === "Realizada" || r.status === "Venda feita") re++;
    if (r.status === "No show") noShow++;
    if (r.status === "Venda feita") {
      vendas++;
      const dv = parseDate(r.dataVenda || r.data);
      if (dv && inPeriod(r.dataVenda || r.data, new Date(from), new Date(to))) {
        faturamento += r.valor || 0;
      }
    }
  });
  const metaAg = periodType === "day" ? g.dailyAg : periodType === "week" ? g.weeklyAg : g.monthlyAg;
  const metaRe = periodType === "day" ? g.dailyRe : periodType === "week" ? g.weeklyRe : g.monthlyRe;
document.getElementById("kpi-row").innerHTML = `
    <div class="kpi-card">
      <div class="label">Agendadas</div>
      <div class="val">${ag}</div>
      <div class="sub">Meta: ${metaAg}</div>
      <div class="progress-track"><div class="progress-fill blue" style="width:${Math.min(100, (ag / metaAg) * 100)}%"></div></div>
    </div>
    <div class="kpi-card">
      <div class="label">Realizadas</div>
      <div class="val">${re}</div>
      <div class="sub">Meta: ${metaRe}</div>
      <div class="progress-track"><div class="progress-fill green" style="width:${Math.min(100, (re / metaRe) * 100)}%"></div></div>
    </div>
    <div class="kpi-card">
      <div class="label">No-show</div>
      <div class="val">${noShow}</div>
      <div class="sub">No período</div>
    </div>
    <div class="kpi-card">
      <div class="label">Vendas</div>
      <div class="val">${vendas}</div>
      <div class="sub">${fmtMoney(faturamento)}</div>
    </div>`;

 const pctMeta = Math.min(100, (faturamento / g.salesTarget) * 100);
  document.getElementById("meta-faturamento").textContent = fmtMoney(faturamento);
  document.getElementById("meta-pct").textContent = `${pctMeta.toFixed(1)}%`;
  document.getElementById("bar-meta").style.width = `${pctMeta}%`;
  document.getElementById("meta-target-label").textContent = fmtMoney(g.salesTarget);
 const totalDecisao = re + noShow;
  const pctShow = totalDecisao ? ((re / totalDecisao) * 100).toFixed(1) : "—";
  const pctNoShow = totalDecisao ? ((noShow / totalDecisao) * 100).toFixed(1) : "—";
  const pctConv = totalDecisao ? ((vendas / totalDecisao) * 100).toFixed(1) : "—";
  document.getElementById("stats-table").innerHTML = `
    <tr><td>Agendadas (sem canceladas)</td><td>${ag}</td><td>—</td></tr>
    <tr><td>Realizadas + Vendas</td><td>${re}</td><td>${pctShow}%</td></tr>
    <tr><td>No-show</td><td>${noShow}</td><td>${pctNoShow}%</td></tr>
    <tr><td>Vendas fechadas</td><td>${vendas}</td><td>${pctConv}%</td></tr>
    <tr><td>Taxa show (realizadas ÷ decisão)</td><td colspan="2"><strong>${pctShow}%</strong></td></tr>
    <tr><td>Taxa conversão (vendas ÷ decisão)</td><td colspan="2"><strong>${pctConv}%</strong></td></tr>`;
  renderRanking(from, to);
  const taxa = faturamento > 250000 ? 0.0075 : 0.005; 
  const comissaoVendas = faturamento * taxa;
  const comissaoReunioes = re * 30; 
  const totalBonus = listaBonus.reduce((a, b) => a + (b.val || 0), 0);
  const totalFinal = comissaoVendas + comissaoReunioes + totalBonus;
  document.getElementById("val-comissao-vendas").textContent = fmtMoney(comissaoVendas);
  document.getElementById("val-taxa-comissao").textContent = `Taxa: ${(taxa * 100).toFixed(2)}% sobre vendas`;
  const elReunioes = document.getElementById("val-comissao-reunioes");
  if (elReunioes) elReunioes.textContent = fmtMoney(comissaoReunioes);
  const elQtdReunioes = document.getElementById("val-qtd-reunioes");
  if (elQtdReunioes) elQtdReunioes.textContent = `${re} realizadas (R$ 30/cada)`;
  document.getElementById("val-bonus-total").textContent = fmtMoney(totalBonus);
  document.getElementById("val-bonus-count").textContent = `${listaBonus.length} bônus ativo(s)`;
  document.getElementById("val-total-final").textContent = fmtMoney(totalFinal);
  const preview = document.getElementById("bonus-preview-list");
  preview.innerHTML = listaBonus.length
    ? listaBonus.map((b) => `<span class="bonus-chip">${esc(b.desc)} · <strong>${fmtMoney(b.val)}</strong></span>`).join("")
    : `<span class="text-muted text-sm">Nenhum bônus cadastrado.</span>`;
  const mesFrom = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const mesTo = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
  const reunioesMes = reunioesNoPeriodo(mesFrom, mesTo);
  const mesRe = reunioesMes.filter((r) => r.status === "Realizada" || r.status === "Venda feita").length;
  const mesAg = reunioesMes.filter((r) => r.status !== "Cancelada").length; 
  const banner = document.getElementById("status-comissao");
  if (mesAg >= 100 && mesRe >= 50) {
    banner.className = "status-banner success";
    banner.textContent = `🏆 Comissão liberada! ${mesAg} agendadas e ${mesRe} realizadas no mês.`;
  } else {
    banner.className = "status-banner warning";
    banner.textContent = `⚠️ Meta p/ liberar: 100 agend. (tem ${mesAg}) e 50 real. (tem ${mesRe}).`;
  }
}

function renderRanking(from, to) {
  const items = reunioesNoPeriodo(new Date(from), new Date(to));
  const map = {};
  config.closers.forEach((nome) => {
    map[nome] = { ag: 0, re: 0, ns: 0, vendas: 0, total: 0 };
  });
  items.forEach((r) => {
    if (!map[r.closer]) map[r.closer] = { ag: 0, re: 0, ns: 0, vendas: 0, total: 0 };
    const c = map[r.closer];
    if (r.status !== "Cancelada") c.ag++;
    if (r.status === "Realizada" || r.status === "Venda feita") c.re++;
    if (r.status === "No show") c.ns++;
    if (r.status === "Venda feita") { c.vendas++; c.total += r.valor || 0; }
  });
  const rows = Object.entries(map)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([nome, s]) => `<tr>
      <td><strong>${esc(nome)}</strong></td>
      <td>${s.ag}</td><td>${s.re}</td><td>${s.ns}</td><td>${s.vendas}</td>
      <td>${fmtMoney(s.total)}</td>
    </tr>`).join("");
  document.getElementById("ranking-table").innerHTML = rows || `<tr><td colspan="6" class="text-muted">Sem dados</td></tr>`;
}

// ==========================================
// 8. REUNIÕES — TABELA & FILTROS
// ==========================================

function renderizarTabela() {
  const tbody = document.getElementById("lista-reunioes");
  const closerF = document.getElementById("filtro-closer").value;
  const deF = document.getElementById("filtro-data-de").value;
  const ateF = document.getElementById("filtro-data-ate").value;
  const statusF = document.getElementById("filtro-status").value;
  const tipoF = document.getElementById("filtro-tipo").value;
  let rows = [...listaReunioes].sort((a, b) => (b.data || "").localeCompare(a.data || ""));
if (closerF) rows = rows.filter((r) => r.closer === closerF);
  if (deF) rows = rows.filter((r) => r.data >= deF);
  if (ateF) rows = rows.filter((r) => r.data <= ateF);
  if (statusF) rows = rows.filter((r) => r.status === statusF);
  if (tipoF === "concluida") rows = rows.filter((r) => r.status === "Realizada" || r.status === "Venda feita");
  if (tipoF === "venda") rows = rows.filter((r) => r.status === "Venda feita");
  if (tipoF === "followup") rows = rows.filter((r) => r.followUp && (!r.retornoData || parseDate(r.retornoData) >= new Date()));
document.getElementById("total-registros").textContent = `${rows.length} registros`;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-muted" style="text-align:center;padding:40px">Nenhuma reunião encontrada.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map((r) => {
    const dataFmt = r.data ? r.data.split("-").reverse().join("/") : "—";
    const retFmt = r.retornoData ? r.retornoData.split("-").reverse().join("/") : "—";
    const stCls = "st-" + (r.status || "").replace(/\s+/g, "").toLowerCase();
    const followHtml = r.followUp
      ? `<span class="followup-badge" title="${esc(r.followUp)}">${esc(r.followUp)}</span>`
      : `<span class="text-muted">—</span>`;
    const retHtml = r.retornoData
      ? `<span class="${parseDate(r.retornoData) < new Date() ? "followup-pending" : ""}">${retFmt}</span>`
      : `<span class="text-muted">—</span>`;
    return `<tr>
      <td class="lead-cell"><strong>${esc(r.leadNome)}</strong><span>${esc(r.leadEmail || "—")}</span></td>
      <td><span class="tag-temp temp-${r.leadTemp || "Morno"}">${r.leadTemp || "Morno"}</span></td>
      <td>${dataFmt}</td>
      <td>${esc(r.closer)}</td>
      <td style="max-width:180px;font-size:.78rem">${esc(r.produto)}</td>
      <td>${fmtMoney(r.valor)}</td>
      <td><span class="${stCls}">${r.status}</span></td>
      <td>${followHtml}</td>
      <td>${retHtml}</td>
      <td style="white-space:nowrap">
        <button class="btn-icon" onclick="editarReuniao('${r.id}')" title="Editar">✏</button>
        <button class="btn-icon del" onclick="deletarReuniao('${r.id}')" title="Excluir">🗑</button>
      </td>
    </tr>`;
  }).join("");
}

// ==========================================
// 9. MODAL REUNIÃO
// ==========================================

function renderizarClosersSelect() {
  const sel = document.getElementById("reuniao-closer");
  const val = sel.value;
  sel.innerHTML = '<option value="">Selecione…</option>';
  config.closers.forEach((c) => {
    sel.innerHTML += `<option value="${esc(c)}" ${c === val ? "selected" : ""}>${esc(c)}</option>`;
  });
const filtro = document.getElementById("filtro-closer");
  const fVal = filtro.value;
  filtro.innerHTML = '<option value="">Todos closers</option>';
  config.closers.forEach((c) => {
    filtro.innerHTML += `<option value="${esc(c)}" ${c === fVal ? "selected" : ""}>${esc(c)}</option>`;
  });
}

function renderizarProdutos() {
  const pSelect = document.getElementById("reuniao-produto");
  const cur = pSelect.value;
  pSelect.innerHTML = '<option value="">Selecione…</option>';
  PRODUTOS_B7.forEach((p) => {
    pSelect.innerHTML += `<option value="${esc(p.nome)}" data-val="${p.valor}" ${p.nome === cur ? "selected" : ""}>${esc(p.nome)} — ${fmtMoney(p.valor)}</option>`;
  });
}

function atualizarValorProduto() {
  const sel = document.getElementById("reuniao-produto");
  const opt = sel.options[sel.selectedIndex];
  if (opt?.value) document.getElementById("reuniao-valor").value = opt.getAttribute("data-val");
}

function abrirModalReuniao(isEdicao = false) {
  document.getElementById("modal-reuniao-title").textContent = isEdicao ? "Editar reunião" : "Nova reunião";
  if (!isEdicao) {
    limparFormReuniao();
    document.getElementById("reuniao-data").value = new Date().toISOString().split("T")[0];
  }
  renderizarClosersSelect();
  renderizarProdutos();
  document.getElementById("modal-reuniao").hidden = false;
}

function fecharModalReuniao() {
  document.getElementById("modal-reuniao").hidden = true;
  limparFormReuniao();
}

function toggleDataVenda() {
  const st = document.getElementById("reuniao-status").value;
  const grp = document.getElementById("group-data-venda");
  if (st === "Venda feita") {
    grp.hidden = false;
    if (!document.getElementById("venda-data").value) {
      document.getElementById("venda-data").value = new Date().toISOString().split("T")[0];
    }
  } else {
    grp.hidden = true;
    document.getElementById("venda-data").value = "";
  }
}

function salvarReuniao(e) {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) {
    alert("Erro: Usuário não autenticado.");
    return;
  }

  const id = document.getElementById("reuniao-id").value;
  const dados = {
    userId: user.uid,
    leadNome: document.getElementById("lead-nome").value.trim(),
    leadEmail: document.getElementById("lead-email").value.trim(),
    leadTemp: document.getElementById("lead-temp").value,
    data: document.getElementById("reuniao-data").value,
    closer: document.getElementById("reuniao-closer").value,
    produto: document.getElementById("reuniao-produto").value,
    valor: parseFloat(document.getElementById("reuniao-valor").value) || 0,
    status: document.getElementById("reuniao-status").value,
    dataVenda: document.getElementById("venda-data").value || null,
    followUp: document.getElementById("reuniao-followup").value.trim() || null,
    retornoData: document.getElementById("reuniao-retorno").value || null,
    atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
  };

  if (id) {
    db.collection("reunioes_b7").doc(id).update(dados);
  } else {
    db.collection("reunioes_b7").add(dados);
  }
  fecharModalReuniao();
}

function editarReuniao(id) {
  const r = listaReunioes.find((x) => x.id === id);
  if (!r) return;
  abrirModalReuniao(true);
  document.getElementById("reuniao-id").value = r.id;
  document.getElementById("lead-nome").value = r.leadNome || "";
  document.getElementById("lead-email").value = r.leadEmail || "";
  document.getElementById("lead-temp").value = r.leadTemp || "Morno";
  document.getElementById("reuniao-data").value = r.data || "";
  document.getElementById("reuniao-closer").value = r.closer || "";
  document.getElementById("reuniao-produto").value = r.produto || "";
  document.getElementById("reuniao-valor").value = r.valor || 0;
  document.getElementById("reuniao-status").value = r.status || "Agendada";
  document.getElementById("reuniao-followup").value = r.followUp || "";
  document.getElementById("reuniao-retorno").value = r.retornoData || "";
  toggleDataVenda();
  if (r.dataVenda) document.getElementById("venda-data").value = r.dataVenda;
}
function deletarReuniao(id) {
  if (confirm("Excluir esta reunião permanentemente?")) {
    db.collection("reunioes_b7").doc(id).delete();
  }
}
function limparFormReuniao() {
  document.getElementById("form-reuniao").reset();
  document.getElementById("reuniao-id").value = "";
  document.getElementById("group-data-venda").hidden = true;
}

// ==========================================
// 10. BÔNUS
// ==========================================

function abrirModalBonus() {
  renderizarListaBonusModal();
  document.getElementById("modal-bonus").hidden = false;
}
function fecharModalBonus() {
  document.getElementById("modal-bonus").hidden = true;
}
function adicionarBonus(e) {
  e.preventDefault();
  const user = auth.currentUser;
  const desc = document.getElementById("novo-bonus-desc").value.trim();
  const val = parseFloat(document.getElementById("novo-bonus-val").value);
  
  if (desc && val && user) {
    db.collection("bonus_sdr").add({ userId: user.uid, desc, val }).then(() => {
      document.getElementById("novo-bonus-desc").value = "";
      document.getElementById("novo-bonus-val").value = "";
    });
  }
}

function removerBonus(id) { db.collection("bonus_sdr").doc(id).delete(); }

function renderizarListaBonusModal() {
  const container = document.getElementById("lista-bonus-container");
  let total = 0;
  if (!listaBonus.length) {
    container.innerHTML = `<span class="text-muted text-sm" style="padding:12px">Nenhum bônus cadastrado.</span>`;
  } else {
    container.innerHTML = listaBonus.map((b) => {
      total += b.val || 0;
      return `<div class="bonus-item">
        <div><strong>${esc(b.desc)}</strong><div class="text-sm" style="color:var(--green)">${fmtMoney(b.val)}</div></div>
        <button class="btn-icon del" onclick="removerBonus('${b.id}')" type="button">🗑</button>
      </div>`;
    }).join("");
  }
  document.getElementById("modal-bonus-total-preview").textContent = fmtMoney(total);
}

// ==========================================
// 11. CONFIGURAÇÕES UI
// ==========================================

function renderConfigForm() {
  const g = config.goals;
  document.getElementById("form-metas").innerHTML = `
    <label>Diária — agendadas</label><input type="number" id="cfg-daily-ag" value="${g.dailyAg}">
    <label>Diária — realizadas</label><input type="number" id="cfg-daily-re" value="${g.dailyRe}">
    <label>Semanal — agendadas</label><input type="number" id="cfg-weekly-ag" value="${g.weeklyAg}">
    <label>Semanal — realizadas</label><input type="number" id="cfg-weekly-re" value="${g.weeklyRe}">
    <label>Mensal — agendadas</label><input type="number" id="cfg-monthly-ag" value="${g.monthlyAg}">
    <label>Mensal — realizadas</label><input type="number" id="cfg-monthly-re" value="${g.monthlyRe}">`;
document.getElementById("cfg-meta-vendas").value = g.salesTarget;
  document.getElementById("cfg-comissao").value = (config.commissionRate * 100).toFixed(2);
  document.getElementById("cfg-min-realizadas").value = g.minRealizadas;
const list = document.getElementById("closers-config-list");
  list.innerHTML = config.closers.map((c, i) => `
    <div class="closer-row">
      <input type="text" value="${esc(c)}" data-idx="${i}">
      <button class="btn-icon del" onclick="removerCloserConfig(${i})" type="button">×</button>
    </div>`).join("");
}

function adicionarCloserConfig() {
  config.closers.push("Novo Closer");
  renderConfigForm();
}
function removerCloserConfig(idx) {
  if (config.closers.length <= 1) return;
  config.closers.splice(idx, 1);
  renderConfigForm();
}
// ==========================================
// 12.RENDER GERAL
// ==========================================
function renderizarTudo() {
  renderizarClosersSelect();
  renderizarDashboard();
  renderizarTabela();
  if (!document.getElementById("modal-bonus").hidden) renderizarListaBonusModal();
}