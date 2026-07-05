// Perfil oficial no Instagram — altere para o @ da marmoraria
const INSTAGRAM_URL = 'https://www.instagram.com/_goldstonemarmores/';

const setInstagramLinks = () => {
    const ids = ['instagramNav', 'instagramFloat', 'instagramFooter'];
    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.href = INSTAGRAM_URL;
    });
};

// Efeito de mudança no Header ao rolar a página
window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (!header) return;
    if (window.scrollY > 50) {
        header.style.background = 'linear-gradient(180deg, rgba(8, 8, 9, 0.98) 0%, rgba(8, 8, 9, 0.94) 100%)';
        header.style.padding = '10px 5%';
    } else {
        header.style.background = '';
        header.style.padding = '';
    }
});

// Catálogo de pedras (imagens da pasta Imagens)
const catalogItems = [
    { fileName: 'areagourmettajmahal1.jpeg', model: 'área gourmet', stoneType: 'taj mahal' },
    { fileName: 'areagourmettajmahal2.jpeg', model: 'área gourmet', stoneType: 'taj mahal' },
    { fileName: 'bancadamarromimperador1.jpeg', model: 'bancada', stoneType: 'marrom imperador' },
    { fileName: 'bancadamarromimperador2.jpeg', model: 'bancada', stoneType: 'marrom imperador' },
    { fileName: 'champanheiratajmahal1.jpeg', model: 'champanheira', stoneType: 'taj mahal' },
    { fileName: 'churrasqueirapretosaogabriel1.jpeg', model: 'churrasqueira', stoneType: 'preto são gabriel' },
    { fileName: 'churrasqueirapretosaogabriel2.jpeg', model: 'churrasqueira', stoneType: 'preto são gabriel' },
    { fileName: 'churrasqueirapretosaogabriel3.jpeg', model: 'churrasqueira', stoneType: 'preto são gabriel' },
    { fileName: 'churrasqueirapretosaogabriel4.jpeg', model: 'churrasqueira', stoneType: 'preto são gabriel' },
    { fileName: 'churrasqueirapretosaogabriel5.jpeg', model: 'churrasqueira', stoneType: 'preto são gabriel' },
    { fileName: 'cozinhapretosaogabriel1.jpeg', model: 'cozinha', stoneType: 'preto são gabriel' },
    { fileName: 'cozinhapretosaogabriel2.jpeg', model: 'cozinha', stoneType: 'preto são gabriel' },
    { fileName: 'lavaboquartzitoverdeguatemala1.jpeg', model: 'lavabo', stoneType: 'quartzo verde guatemala' },
    { fileName: 'lavaboquartzitoverdeguatemala2.jpeg', model: 'lavabo', stoneType: 'quartzo verde guatemala' },
    { fileName: 'lavaboquartzitoverdeguatemala3.jpeg', model: 'lavabo', stoneType: 'quartzo verde guatemala' }
];

const getImagePath = (fileName) => encodeURI(`Imagens/${fileName}`);

const getSequenceNumber = (fileName) => {
    const match = fileName.match(/\((\d+)\)\.(jpe?g|png|webp)$/i);
    return match ? Number(match[1]) : 0;
};

const buildGroupedCatalog = () => {
    const groups = {};

    catalogItems.forEach((item) => {
        const bucketKey = `${item.model}__${item.stoneType}`;
        if (!groups[bucketKey]) {
            groups[bucketKey] = {
                key: bucketKey,
                items: [],
                model: item.model,
                stoneType: item.stoneType,
            };
        }
        groups[bucketKey].items.push(item);
    });

    const grouped = Object.values(groups);

    grouped.forEach((group) => {
        group.items.sort((a, b) => {
            const seqA = getSequenceNumber(a.fileName);
            const seqB = getSequenceNumber(b.fileName);
            if (seqA !== seqB) return seqA - seqB;
            return a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' });
        });
    });

    return grouped;
};

let groupedCatalog = buildGroupedCatalog();

const refreshGroupedCatalog = () => {
    groupedCatalog = buildGroupedCatalog();
    renderCatalog();
};

let currentGroup = null;
let currentIndex = 0;
let modalVisibleLayerIsA = true;

const layerA = () => document.getElementById('modalLayerA');
const layerB = () => document.getElementById('modalLayerB');

const syncModalCaption = () => {
    const modalCaption = document.getElementById('modalCaption');
    if (!currentGroup) return;
    const item = currentGroup.items[currentIndex];
    modalCaption.textContent = `${item.model.charAt(0).toUpperCase() + item.model.slice(1)} • ${item.stoneType.charAt(0).toUpperCase() + item.stoneType.slice(1)} — ${currentIndex + 1}/${currentGroup.items.length}`;
};

const updateModalProgress = () => {
    const el = document.getElementById('modalProgress');
    if (!el || !currentGroup) return;
    el.innerHTML = '';
    currentGroup.items.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = 'modal-progress-dot' + (i === currentIndex ? ' is-active' : '');
        el.appendChild(dot);
    });
};

const applyLayerContent = (layerEl, item) => {
    layerEl.src = getImagePath(item.fileName);
    layerEl.alt = `${item.stoneType} - ${item.model}`;
};

const layerVisibleEl = () => (modalVisibleLayerIsA ? layerA() : layerB());

const crossfadeModalToIndex = (nextIndex) => {
    if (!currentGroup) return;
    const incoming = modalVisibleLayerIsA ? layerB() : layerA();
    const outgoing = layerVisibleEl();

    const item = currentGroup.items[nextIndex];
    applyLayerContent(incoming, item);

    const onReady = () => {
        incoming.classList.add('is-visible');
        incoming.classList.remove('is-to-back');
        outgoing.classList.remove('is-visible');
        outgoing.classList.add('is-to-back');
        modalVisibleLayerIsA = !modalVisibleLayerIsA;
        currentIndex = nextIndex;
        syncModalCaption();
        updateModalProgress();
    };

    if (incoming.complete && incoming.naturalWidth > 0) {
        requestAnimationFrame(() => requestAnimationFrame(onReady));
    } else {
        incoming.addEventListener('load', onReady, { once: true });
    }
};

const openModal = (groupKey, index) => {
    const group = groupedCatalog.find((g) => g.key === groupKey);
    if (!group) return;

    currentGroup = group;
    currentIndex = index;
    modalVisibleLayerIsA = true;

    const modal = document.getElementById('galleryModal');
    const a = layerA();
    const b = layerB();

    b.classList.remove('is-visible');
    b.classList.add('is-to-back');

    applyLayerContent(a, group.items[currentIndex]);
    a.classList.add('is-visible');
    a.classList.remove('is-to-back');

    syncModalCaption();
    updateModalProgress();

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
};

const closeModal = () => {
    const modal = document.getElementById('galleryModal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
};

const navigateModal = (direction) => {
    if (!currentGroup) return;
    const len = currentGroup.items.length;
    const next = (currentIndex + direction + len) % len;
    crossfadeModalToIndex(next);
};

const CARD_SLIDE_INTERVAL_MS = 4800;

const prefersReducedMotion = () =>
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const bindCardPreviewCrossfade = (card, group) => {
    if (group.items.length < 2 || prefersReducedMotion()) return;

    const imgs = card.querySelectorAll('.card-slide');
    if (imgs.length < 2) return;

    const img0 = imgs[0];
    const img1 = imgs[1];
    let photoIndex = 0;
    let showingFirst = true;
    let timer = null;

    const resetSlides = () => {
        photoIndex = 0;
        showingFirst = true;
        img0.src = getImagePath(group.items[0].fileName);
        img0.alt = `${group.stoneType} - ${group.model}`;
        const second = group.items[Math.min(1, group.items.length - 1)];
        img1.src = getImagePath(second.fileName);
        img1.alt = img0.alt;
        img0.classList.add('is-visible');
        img0.classList.remove('is-exit');
        img1.classList.remove('is-visible');
        img1.classList.remove('is-exit');
    };

    const step = () => {
        photoIndex = (photoIndex + 1) % group.items.length;
        const item = group.items[photoIndex];
        const incoming = showingFirst ? img1 : img0;
        const outgoing = showingFirst ? img0 : img1;

        applyLayerContent(incoming, item);

        const onReady = () => {
            incoming.classList.add('is-visible');
            incoming.classList.remove('is-exit');
            outgoing.classList.remove('is-visible');
            outgoing.classList.add('is-exit');
            showingFirst = !showingFirst;
        };

        if (incoming.complete && incoming.naturalWidth > 0) {
            requestAnimationFrame(() => requestAnimationFrame(onReady));
        } else {
            incoming.addEventListener('load', onReady, { once: true });
        }
    };

    const io = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    if (!timer) timer = window.setInterval(step, CARD_SLIDE_INTERVAL_MS);
                } else {
                    if (timer) {
                        window.clearInterval(timer);
                        timer = null;
                    }
                    resetSlides();
                }
            });
        },
        { threshold: 0.32 }
    );

    io.observe(card);
};

const createCard = (group) => {
    const card = document.createElement('div');
    card.className = 'stone-card';

    const zoom = document.createElement('div');
    zoom.className = 'zoom-container';

    const stack = document.createElement('div');
    stack.className = 'card-slide-stack';

    const imgA = document.createElement('img');
    imgA.className = 'card-slide is-visible';
    imgA.src = getImagePath(group.items[0].fileName);
    imgA.alt = `${group.stoneType} - ${group.model}`;

    const imgB = document.createElement('img');
    imgB.className = 'card-slide';
    if (group.items.length > 1) {
        imgB.src = getImagePath(group.items[1].fileName);
    } else {
        imgB.src = imgA.src;
    }
    imgB.alt = imgA.alt;

    stack.appendChild(imgA);
    stack.appendChild(imgB);

    const shimmer = document.createElement('div');
    shimmer.className = 'card-shimmer';
    shimmer.setAttribute('aria-hidden', 'true');

    zoom.appendChild(stack);
    zoom.appendChild(shimmer);
    card.appendChild(zoom);

    const info = document.createElement('div');
    info.className = 'stone-info';

    const title = document.createElement('h3');
    title.textContent = `${group.model.charAt(0).toUpperCase() + group.model.slice(1)} • ${group.stoneType.charAt(0).toUpperCase() + group.stoneType.slice(1)}`;

    const desc = document.createElement('p');
    desc.textContent = `${group.items.length} foto(s) na coleção. Clique para abrir com transição entre as imagens.`;

    info.appendChild(title);
    info.appendChild(desc);
    card.appendChild(info);

    card.addEventListener('click', () => openModal(group.key, 0));
    bindCardPreviewCrossfade(card, group);

    return card;
};

const renderCatalog = () => {
    const grid = document.getElementById('catalogGrid');
    grid.innerHTML = '';

    if (!groupedCatalog.length) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'Nenhuma pedra encontrada.';
        emptyMessage.style.color = '#ddd';
        grid.appendChild(emptyMessage);
        return;
    }

    groupedCatalog.forEach((group) => grid.appendChild(createCard(group)));
};

const initHeroSlides = () => {
    const host = document.getElementById('heroSlides');
    if (!host) return;

    const paths = [...new Set(catalogItems.map((i) => getImagePath(i.fileName)))].slice(0, 5);
    if (!paths.length) return;

    paths.forEach((url, i) => {
        const slide = document.createElement('div');
        slide.className = 'hero-slide' + (i === 0 ? ' is-active' : '');
        slide.style.backgroundImage = `url("${url}")`;
        host.appendChild(slide);
    });

    let active = 0;
    const slides = () => [...host.querySelectorAll('.hero-slide')];

    window.setInterval(() => {
        const list = slides();
        if (list.length < 2) return;
        list[active].classList.remove('is-active');
        active = (active + 1) % list.length;
        list[active].classList.add('is-active');
    }, 7000);
};

window.addEventListener('DOMContentLoaded', () => {
    setInstagramLinks();
    initHeroSlides();

    const modal = document.getElementById('galleryModal');
    const closeBtn = modal.querySelector('.modal-close');
    const prevBtn = modal.querySelector('.modal-prev');
    const nextBtn = modal.querySelector('.modal-next');

    closeBtn.addEventListener('click', closeModal);
    prevBtn.addEventListener('click', () => navigateModal(-1));
    nextBtn.addEventListener('click', () => navigateModal(1));
    modal.addEventListener('click', (event) => {
        if (event.target.dataset.close === 'true') {
            closeModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (!modal.classList.contains('open')) return;
        if (event.key === 'Escape') closeModal();
        if (event.key === 'ArrowRight') navigateModal(1);
        if (event.key === 'ArrowLeft') navigateModal(-1);
    });

    const hamburger = document.querySelector('.hamburger');
    const header = document.querySelector('header');
    const navLinks = document.querySelectorAll('nav a');

    const toggleMenu = () => {
        const isOpen = header.classList.toggle('nav-open');
        hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };

    hamburger.addEventListener('click', toggleMenu);
    navLinks.forEach((link) => {
        link.addEventListener('click', () => {
            if (header.classList.contains('nav-open')) toggleMenu();
        });
    });

    renderCatalog();
});

// Mensagem personalizada para o WhatsApp
document.querySelectorAll('a[href*="wa.me"]').forEach((button) => {
    button.addEventListener('click', () => {
        const whatsappMessage = encodeURIComponent('Olá! Tenho interesse em orçamento para pedras e projetos de alto padrão.');
        const base = button.href.split('?')[0];
        button.href = `${base}?text=${whatsappMessage}`;
    });
});
