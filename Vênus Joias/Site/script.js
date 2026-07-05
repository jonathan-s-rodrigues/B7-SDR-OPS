import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
/**
 * Adiciona um produto ao estoque (Firestore) e atualiza o catálogo automaticamente.
 * @param {{nome:string, preco:number, categoria:string, imagem?:string, estoque:number}} produto
 */
async function adicionarProduto(produto) {
  const produtosRef = collection(db, 'produtos');
  await addDoc(produtosRef, {
    ...produto,
    createdAt: serverTimestamp()
  });
  // Atualiza o catálogo após adicionar
  await loadProductsFromFirestore();
  setActiveCategory('todos');
}

// ...existing code...

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** +55 11 97679-2966 — somente dígitos (DDI + DDD + número) para o link do WhatsApp */
const WHATSAPP_PEDIDO_NUMERO = '5511976792966';

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

const els = {
  grid: document.getElementById('products-grid'),
  filters: document.getElementById('filters'),
  menuCategories: document.getElementById('menu-categories'),
  menuBtn: document.getElementById('menu-btn'),
  menuModal: document.getElementById('mobile-menu-modal'),
  closeMenu: document.getElementById('close-menu'),
  cartBtn: document.getElementById('cart-btn'),
  cartModal: document.getElementById('cart-modal'),
  cartItems: document.getElementById('cart-items'),
  cartCount: document.getElementById('cart-count'),
  cartTotal: document.getElementById('cart-total'),
  closeCart: document.getElementById('close-cart'),
  checkoutBtn: document.getElementById('checkout-btn'),
  openCartCta: document.getElementById('open-cart-cta'),
};

/** @type {Array<{id:string,nome:string,preco:number,categoria:string,imagem?:string,estoque:number}>} */
let PRODUCTS = [];
let activeCategory = 'todos';

/** @type {Map<string, {id:string,nome:string,preco:number,categoria:string,imagem?:string,estoque:number,qtd:number}>} */
const cart = new Map();

function normalizeCategory(cat) {
  const c = String(cat || '').trim().toLowerCase();
  if (!c) return 'itens';
  return c
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

function labelCategoria(cat) {
  switch (cat) {
    case 'pulseiras': return 'Pulseiras';
    case 'colares': return 'Colares';
    case 'brincos': return 'Brincos';
    case 'conjuntos': return 'Conjuntos';
    case 'correntes': return 'Correntes';
    case 'tornozeleiras': return 'Tornozeleiras';
    case 'acessorios': return 'Acessórios';
    case 'itens': return 'Itens';
    default: return cat.charAt(0).toUpperCase() + cat.slice(1);
  }
}

function getCategoriesFromProducts() {
  const set = new Set(PRODUCTS.map(p => p.categoria).filter(Boolean));
  return ['todos', ...[...set].sort((a, b) => labelCategoria(a).localeCompare(labelCategoria(b), 'pt-BR'))];
}

function renderCategoryButtons() {
  const cats = getCategoriesFromProducts();

  if (els.filters) {
    els.filters.innerHTML = cats.map(cat => `
      <button class="filter-btn ${cat === activeCategory ? 'active' : ''}" data-cat="${cat}">
        ${cat === 'todos' ? 'Todos' : escapeHtml(labelCategoria(cat))}
      </button>
    `).join('');
  }

  if (els.menuCategories) {
    els.menuCategories.innerHTML = cats.map(cat => `
      <button class="menu-filter-btn ${cat === activeCategory ? 'active' : ''}" data-cat="${cat}">
        ${cat === 'todos' ? 'Todos' : escapeHtml(labelCategoria(cat))}
      </button>
    `).join('');
  }
}

function setActiveCategory(cat) {
  activeCategory = cat || 'todos';
  renderCategoryButtons();
  renderProducts(activeCategory);
}

function renderProducts(category = 'todos') {
  const list = category === 'todos'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.categoria === category);

  if (!list.length) {
    els.grid.innerHTML = `
      <div style="grid-column:1/-1; color:#6a6661; padding: 18px; border: 1px dashed rgba(31,31,31,0.18); border-radius: 16px;">
        Nenhum produto cadastrado nessa categoria.
      </div>
    `;
    return;
  }

  els.grid.innerHTML = list.map(p => {
    const disponivel = (p.estoque ?? 0) > 0;
    return `
    <article class="product-card" data-id="${p.id}">
      <img class="product-img" src="${p.imagem || ''}" alt="${escapeHtml(p.nome)}" loading="lazy">
      <div class="product-info">
        <div>
          <div class="product-title">${escapeHtml(p.nome)}</div>
          <div class="product-meta">
            <div class="product-cat">${escapeHtml(labelCategoria(p.categoria))}</div>
            <div class="product-price">${BRL.format(p.preco)}</div>
          </div>
          <div style="margin-top:10px;">
            ${disponivel
              ? `<span class="stock-badge">Em estoque: ${p.estoque}</span>`
              : `<span class="stock-badge out">Esgotado</span>`
            }
          </div>
        </div>
        <button class="btn-add" ${disponivel ? `data-add="${p.id}"` : 'disabled'}>${disponivel ? 'Adicionar à sacola' : 'Indisponível'}</button>
      </div>
    </article>
  `;
  }).join('');
}

function openCart() { els.cartModal.classList.add('open'); }
function closeCart() { els.cartModal.classList.remove('open'); }

function openMenu() {
  if (!els.menuModal) return;
  els.menuModal.classList.add('open');
  els.menuModal.setAttribute('aria-hidden', 'false');
  els.menuBtn?.setAttribute('aria-expanded', 'true');
}
function closeMenu() {
  if (!els.menuModal) return;
  els.menuModal.classList.remove('open');
  els.menuModal.setAttribute('aria-hidden', 'true');
  els.menuBtn?.setAttribute('aria-expanded', 'false');
}

function addToCart(productId) {
  const p = PRODUCTS.find(x => x.id === productId);
  if (!p) return;
  if ((p.estoque ?? 0) <= 0) return;
  const existing = cart.get(productId);
  if (existing) {
    if (existing.qtd >= (existing.estoque ?? 0)) return;
    existing.qtd += 1;
  } else {
    cart.set(productId, { ...p, qtd: 1 });
  }
  renderCart();
  openCart();
}

function inc(productId) {
  const item = cart.get(productId);
  if (!item) return;
  if (item.qtd >= (item.estoque ?? 0)) return;
  item.qtd += 1;
  renderCart();
}

function dec(productId) {
  const item = cart.get(productId);
  if (!item) return;
  item.qtd -= 1;
  if (item.qtd <= 0) cart.delete(productId);
  renderCart();
}

function remove(productId) {
  cart.delete(productId);
  renderCart();
}

function getTotals() {
  const items = [...cart.values()];
  const count = items.reduce((acc, i) => acc + i.qtd, 0);
  const total = items.reduce((acc, i) => acc + i.qtd * i.preco, 0);
  return { count, total, items };
}

function renderCart() {
  const { count, total, items } = getTotals();
  els.cartCount.textContent = String(count);
  els.cartTotal.textContent = BRL.format(total);

  if (!items.length) {
    els.cartItems.innerHTML = `
      <div style="color:#6a6661; padding: 18px; border: 1px dashed rgba(31,31,31,0.18); border-radius: 16px;">
        Sua sacola está vazia. Adicione uma joia para continuar.
      </div>
    `;
    return;
  }

  els.cartItems.innerHTML = items.map(i => `
    <div class="cart-item" data-id="${i.id}">
      <div>
        <strong>${escapeHtml(i.nome)}</strong>
        <small>${escapeHtml(labelCategoria(i.categoria))} • ${BRL.format(i.preco)}${(i.estoque ?? 0) ? ` • estoque: ${i.estoque}` : ''}</small>
        <div style="margin-top:10px;" class="qty-controls">
          <button class="qty-btn" data-dec="${i.id}" aria-label="Diminuir quantidade">−</button>
          <strong>${i.qtd}</strong>
          <button class="qty-btn" data-inc="${i.id}" aria-label="Aumentar quantidade" ${(i.qtd >= (i.estoque ?? 0)) ? 'disabled' : ''}>+</button>
        </div>
      </div>
      <div style="display:grid; gap:10px; justify-items:end; align-content:start;">
        <strong>${BRL.format(i.qtd * i.preco)}</strong>
        <button class="remove-btn" data-rm="${i.id}" aria-label="Remover item">Remover</button>
      </div>
    </div>
  `).join('');
}

function buildWhatsAppMessage() {
  const { items, total } = getTotals();
  const lines = [];
  lines.push('*Vênus Joias — Pedido via site*');
  lines.push('');
  items.forEach(i => {
    lines.push(`• ${i.qtd}x ${i.nome} — ${BRL.format(i.qtd * i.preco)}`);
  });
  lines.push('');
  lines.push(`*Total:* ${BRL.format(total)}`);
  lines.push('');
  lines.push('Olá! Gostaria de finalizar esse pedido.');
  return lines.join('\n');
}

function checkoutWhatsApp() {
  const { items } = getTotals();
  if (!items.length) return;
  const text = buildWhatsAppMessage();
  const url = `https://api.whatsapp.com/send?phone=${WHATSAPP_PEDIDO_NUMERO}&text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function docMillis(data) {
  const c = data?.createdAt;
  if (!c) return 0;
  try {
    return typeof c.toMillis === 'function' ? c.toMillis() : 0;
  } catch {
    return 0;
  }
}

async function loadProductsFromFirestore() {
  const produtosRef = collection(db, 'produtos');
  let snapshots;
  try {
    const snapOrdered = await getDocs(query(produtosRef, orderBy('createdAt', 'desc')));
    snapshots = snapOrdered.docs;
  } catch (e1) {
    console.warn('[catálogo] query ordenada falhou, tentando leitura simples:', e1?.message || e1);
    try {
      const snapAll = await getDocs(produtosRef);
      snapshots = [...snapAll.docs].sort(
        (a, b) => docMillis(b.data()) - docMillis(a.data()),
      );
    } catch (e2) {
      console.error('[catálogo] Firestore:', e2);
      throw e2;
    }
  }

  PRODUCTS = snapshots.map(d => {
    const data = d.data() || {};
    const nome = String(data.descricao || '').trim();
    const preco = Number(data.precoFinal ?? 0);
    const categoria = normalizeCategory(data.categoria || 'itens');
    const imagem = data.foto || '';
    const estoque = parseInt(data.estoque ?? 0, 10) || 0;
    return {
      id: d.id,
      nome: nome || 'Produto',
      preco: isFinite(preco) ? preco : 0,
      categoria,
      imagem,
      estoque,
    };
  }).filter(p => p.preco > 0);
}

function wireEvents() {
  els.grid.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const id = target?.getAttribute?.('data-add');
    if (id) addToCart(id);
  });

  els.filters?.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const cat = target?.getAttribute?.('data-cat');
    if (cat) setActiveCategory(cat);
  });

  els.menuCategories?.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const cat = target?.getAttribute?.('data-cat');
    if (cat) {
      setActiveCategory(cat);
      closeMenu();
    }
  });

  els.menuBtn?.addEventListener('click', openMenu);
  els.closeMenu?.addEventListener('click', closeMenu);
  els.menuModal?.addEventListener('click', (e) => {
    if (e.target === els.menuModal) closeMenu();
  });

  els.cartBtn.addEventListener('click', openCart);
  els.openCartCta?.addEventListener('click', openCart);
  els.closeCart.addEventListener('click', closeCart);
  els.cartModal.addEventListener('click', (e) => {
    if (e.target === els.cartModal) closeCart();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCart();
      closeMenu();
    }
  });

  els.cartItems.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const incId = target?.getAttribute?.('data-inc');
    const decId = target?.getAttribute?.('data-dec');
    const rmId = target?.getAttribute?.('data-rm');
    if (incId) return inc(incId);
    if (decId) return dec(decId);
    if (rmId) return remove(rmId);
  });

  els.checkoutBtn.addEventListener('click', checkoutWhatsApp);
}

async function init() {
  if (!els.grid) return;
  wireEvents();
  renderCart();

  // Se as regras do Firestore exigirem usuário autenticado para leitura,
  // tentamos login anônimo para permitir o carregamento do catálogo.
  try {
    await signInAnonymously(auth);
  } catch {
    // Se falhar, seguimos mesmo assim (pode ser que as regras permitam leitura pública).
  }

  try {
    await loadProductsFromFirestore();
    setActiveCategory('todos');
  } catch (e) {
    const code = e?.code || '';
    const permissao =
      code === 'permission-denied' ||
      String(e?.message || '').toLowerCase().includes('permission');
    console.error('[catálogo] erro ao inicializar:', e);
    els.grid.innerHTML = `
      <div style="grid-column:1/-1; color:#6a6661; padding: 18px; border: 1px dashed rgba(31,31,31,0.18); border-radius: 16px;">
        Não foi possível carregar o catálogo no momento.${permissao ? `
          <p style="margin-top:12px; font-size:0.92rem;">
            Se isso aparece só na Vercel: no <strong>Firebase Console</strong> → Authentication → <em>Authorized domains</em>,
            inclua seu domínio (<code>.vercel.app</code> ou domínio próprio).
            Confira também em Sign-in method se o login <strong>Anônimo</strong> está ativo e se as <strong>regras do Firestore</strong> permitem leitura da coleção <code>produtos</code> para visitantes/auth anônimo.
          </p>` : ''}
      </div>
    `;
  }
}

init();

