const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const firebase = `
export const initializeApp = () => ({});
export const getFirestore = () => ({});
export const getAuth = () => ({});
export const collection = (db, name) => ({ name });
export const query = ref => ref;
export const orderBy = () => ({});
export const doc = (db, name, id) => id ? { name, id } : { name: db.name, id: 'new-' + (++window.serial) };
export const serverTimestamp = () => new Date();
export const signInAnonymously = async () => ({});
export const signInWithEmailAndPassword = async () => ({ user: { email: 'admin@example.com' } });
export const signOut = async () => {};
export const onAuthStateChanged = (auth, cb) => setTimeout(() => cb({email:'admin@example.com'}), 0);
const snapshot = name => ({ docs: (name === 'produtos' ? window.products : []).map(p => ({id:p.id,data:()=>p})) });
export const getDocs = async ref => snapshot(ref.name);
export const onSnapshot = (ref, cb) => { setTimeout(() => cb(snapshot(ref.name)), 0); return () => {}; };
async function write(ref, data) {
  window.writes.push({ref, data});
  await new Promise(resolve => setTimeout(resolve, 80));
  if (window.failWrite) throw new Error('Falha simulada');
}
export const updateDoc = write;
export const setDoc = write;
export const addDoc = write;
export const deleteDoc = async () => {};
`;

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => {
            window.serial = 0;
            window.writes = [];
            window.products = [
                { id: 'p1', descricao: 'Pulseira Z', categoria: 'pulseiras', custo: 10, precoFinal: 30, estoque: 5, foto: 'https://example.test/photo.jpg' },
                { id: 'p2', descricao: 'Brinco Z', categoria: 'brincos', custo: 12, precoFinal: 40, estoque: 3 },
                { id: 'p3', descricao: 'Brinco A', categoria: 'brincos', custo: 8, precoFinal: 20, estoque: 4 },
            ];
        });
        await page.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.hostname === 'www.gstatic.com') return route.fulfill({ contentType: 'text/javascript', body: firebase });
            if (url.hostname !== 'venus.test') return route.fulfill({ status: 204 });
            const file = path.join(root, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
            try {
                const body = await fs.readFile(file);
                const ext = path.extname(file);
                await route.fulfill({ body, contentType: ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : 'text/html' });
            } catch { await route.fulfill({ status: 404 }); }
        });
        await page.goto('http://venus.test/');
        await page.waitForFunction(() => document.querySelectorAll('.produto-card').length === 3);
        assert.equal(await page.locator('#btnCriarConta').count(), 0);
        assert.deepEqual(await page.locator('.produto-descricao').allTextContents(), ['Brinco A', 'Brinco Z', 'Pulseira Z']);
        await page.click('[data-aba="produtos"]');
        await page.selectOption('#filtroCategoria', 'pulseiras');
        assert.equal(await page.locator('.produto-card').count(), 1);
        await page.click('.btn-editar');
        await page.fill('#prodEstoque', '6');
        await page.click('#btnSalvarProduto');
        await page.waitForFunction(() => document.getElementById('statusProduto').textContent.startsWith('Alterações salvas'));
        let writes = await page.evaluate(() => window.writes);
        assert.equal(writes[0].ref.id, 'p1');
        assert.equal('foto' in writes[0].data, false, 'Unchanged image must not be overwritten');

        await page.fill('#prodDescricao', 'Produto novo');
        await page.fill('#prodCusto', '20');
        const imageData = await page.evaluate(() => {
            const canvas = document.createElement('canvas');
            canvas.width = 1800; canvas.height = 1400;
            canvas.getContext('2d').fillRect(0, 0, 1800, 1400);
            return canvas.toDataURL('image/png').split(',')[1];
        });
        await page.setInputFiles('#prodFoto', {name:'foto.png',mimeType:'image/png',buffer:Buffer.from(imageData,'base64')});
        await page.waitForFunction(() => document.getElementById('statusProduto').textContent.startsWith('Imagem pronta'));
        await page.evaluate(() => window.failWrite = true);
        await page.click('#btnSalvarProduto');
        await page.waitForFunction(() => document.getElementById('statusProduto').textContent.startsWith('Não foi possível'));
        assert.equal(await page.inputValue('#prodDescricao'), 'Produto novo');
        assert.match(await page.locator('#imgPreview').getAttribute('src'), /^data:image\/jpeg/);
        await page.evaluate(() => { window.failWrite = false; document.getElementById('btnSalvarProduto').click(); document.getElementById('btnSalvarProduto').click(); });
        await page.waitForFunction(() => document.getElementById('statusProduto').textContent.startsWith('Produto cadastrado'));
        writes = await page.evaluate(() => window.writes);
        assert.equal(writes.length, 3, 'Double click must not create a second write');
        assert.equal(writes[1].ref.id, writes[2].ref.id, 'Retry keeps the same product ID');
        assert(writes[2].data.foto.length < 700000);
        await page.fill('#prodDescricao', 'Sem foto');
        await page.fill('#prodCusto', '10');
        await page.click('#btnSalvarProduto');
        await page.waitForFunction(() => document.getElementById('statusProduto').textContent.startsWith('Produto cadastrado'));
        assert.equal(await page.evaluate(() => window.writes.at(-1).data.foto), null, 'New product must not reuse last photo');

        await page.click('[data-aba="pedidos"]');
        assert(await page.inputValue('#data'));
        assert(await page.locator('#btnFinalizar').isDisabled());
        await page.fill('#itemNome', 'Brinco A');
        assert.equal(await page.inputValue('#itemValor'), '20.00');
        await page.fill('#itemQtd', '2');
        await page.click('#btnAddItem');
        assert.match(await page.locator('#totalPedido').textContent(), /40,00/);
        await page.fill('[data-quantidade="0"]', '3');
        await page.locator('[data-quantidade="0"]').dispatchEvent('change');
        assert.match(await page.locator('#totalPedido').textContent(), /60,00/);
        await page.click('#btnFinalizar');
        assert.match(await page.locator('#statusPedido').textContent(), /Preencha/);
        await page.fill('#cliente', 'Cliente de validação');
        await page.evaluate(() => window.failWrite = true);
        await page.click('#btnFinalizar');
        await page.waitForFunction(() => document.getElementById('statusPedido').textContent.startsWith('Não foi possível'));
        assert.equal(await page.locator('.item-rascunho').count(), 1);
        await page.evaluate(() => { window.failWrite = false; document.getElementById('btnFinalizar').click(); document.getElementById('btnFinalizar').click(); });
        await page.waitForFunction(() => document.getElementById('statusPedido').textContent.startsWith('Pedido salvo'));
        writes = await page.evaluate(() => window.writes.filter(w => w.ref.name === 'pedidos'));
        assert.equal(writes.length, 2);
        assert.equal(writes[0].ref.id, writes[1].ref.id);
        assert.equal(writes[1].data.totalGeral, 60);
        assert.equal(writes[1].data.itens[0].qtd, 3);
        assert.equal(await page.locator('.item-rascunho').count(), 0);
        await page.setViewportSize({ width: 390, height: 844 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({ path: path.join(root, 'tests', 'pedidos-mobile.png'), fullPage: true });
        await page.goto('http://venus.test/Site/index.html');
        await page.waitForFunction(() => document.querySelectorAll('.product-card').length === 3);
        assert.deepEqual(await page.locator('.product-title').allTextContents(), ['Brinco A', 'Brinco Z', 'Pulseira Z']);
        assert.deepEqual(errors, []);
        console.log('PASS: product photos, image compression, retry and duplicate protection, category ordering/filtering, order editing/totals/saving, mobile layout, storefront ordering. Firebase mocked; no production writes.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
