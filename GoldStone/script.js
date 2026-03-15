// Efeito de mudança no Header ao rolar a página
window.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.style.background = '#000';
        header.style.padding = '10px 5%';
    } else {
        header.style.background = 'rgba(0, 0, 0, 0.95)';
        header.style.padding = '15px 5%';
    }
});

// Catálogo de pedras (imagens do WhatsApp)
const catalogItems = [
    // Pias - Mármore
    { fileName: 'WhatsApp Image 2026-03-09 at 18.57.35.jpeg', model: 'pia', stoneType: 'mármore' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.57.36.jpeg', model: 'pia', stoneType: 'mármore' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.57.42.jpeg', model: 'pia', stoneType: 'mármore' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.57.44 (1).jpeg', model: 'pia', stoneType: 'mármore' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.57.44.jpeg', model: 'pia', stoneType: 'mármore' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.57.45 (1).jpeg', model: 'pia', stoneType: 'mármore' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.57.45 (2).jpeg', model: 'pia', stoneType: 'mármore' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.57.45.jpeg', model: 'pia', stoneType: 'mármore' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.57.47 (1).jpeg', model: 'pia', stoneType: 'mármore' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.57.47 (2).jpeg', model: 'pia', stoneType: 'mármore' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.57.47.jpeg', model: 'pia', stoneType: 'mármore' },

    // Lavatórios - Granito
    { fileName: 'WhatsApp Image 2026-03-09 at 18.59.46.jpeg', model: 'lavatório', stoneType: 'granito' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.59.47 (1).jpeg', model: 'lavatório', stoneType: 'granito' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.59.47 (2).jpeg', model: 'lavatório', stoneType: 'granito' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.59.47.jpeg', model: 'lavatório', stoneType: 'granito' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.59.48.jpeg', model: 'lavatório', stoneType: 'granito' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.59.50 (1).jpeg', model: 'lavatório', stoneType: 'granito' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.59.50 (2).jpeg', model: 'lavatório', stoneType: 'granito' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.59.50 (3).jpeg', model: 'lavatório', stoneType: 'granito' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.59.50 (4).jpeg', model: 'lavatório', stoneType: 'granito' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.59.50.jpeg', model: 'lavatório', stoneType: 'granito' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.59.51 (1).jpeg', model: 'lavatório', stoneType: 'granito' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.59.51 (2).jpeg', model: 'lavatório', stoneType: 'granito' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.59.51 (3).jpeg', model: 'lavatório', stoneType: 'granito' },
    { fileName: 'WhatsApp Image 2026-03-09 at 18.59.51.jpeg', model: 'lavatório', stoneType: 'granito' },

    // Pias - Quartzo
    { fileName: 'WhatsApp Image 2026-03-09 at 19.07.12.jpeg', model: 'pia', stoneType: 'quartzo' },
    { fileName: 'WhatsApp Image 2026-03-09 at 19.07.13 (1).jpeg', model: 'pia', stoneType: 'quartzo' },
    { fileName: 'WhatsApp Image 2026-03-09 at 19.07.13 (2).jpeg', model: 'pia', stoneType: 'quartzo' },
    { fileName: 'WhatsApp Image 2026-03-09 at 19.07.13 (3).jpeg', model: 'pia', stoneType: 'quartzo' },
    { fileName: 'WhatsApp Image 2026-03-09 at 19.07.13 (4).jpeg', model: 'pia', stoneType: 'quartzo' },
    { fileName: 'WhatsApp Image 2026-03-09 at 19.07.13.jpeg', model: 'pia', stoneType: 'quartzo' },
    { fileName: 'WhatsApp Image 2026-03-09 at 19.07.14 (1).jpeg', model: 'pia', stoneType: 'quartzo' },
    { fileName: 'WhatsApp Image 2026-03-09 at 19.07.14 (2).jpeg', model: 'pia', stoneType: 'quartzo' },
    { fileName: 'WhatsApp Image 2026-03-09 at 19.07.14 (3).jpeg', model: 'pia', stoneType: 'quartzo' },
    { fileName: 'WhatsApp Image 2026-03-09 at 19.07.14 (4).jpeg', model: 'pia', stoneType: 'quartzo' },
    { fileName: 'WhatsApp Image 2026-03-09 at 19.07.14.jpeg', model: 'pia', stoneType: 'quartzo' },
    { fileName: 'WhatsApp Image 2026-03-09 at 19.07.15 (1).jpeg', model: 'pia', stoneType: 'quartzo' },
    { fileName: 'WhatsApp Image 2026-03-09 at 19.07.15 (2).jpeg', model: 'pia', stoneType: 'quartzo' },
    { fileName: 'WhatsApp Image 2026-03-09 at 19.07.15 (3).jpeg', model: 'pia', stoneType: 'quartzo' },
    { fileName: 'WhatsApp Image 2026-03-09 at 19.07.15 (4).jpeg', model: 'pia', stoneType: 'quartzo' },
    { fileName: 'WhatsApp Image 2026-03-09 at 19.07.15.jpeg', model: 'pia', stoneType: 'quartzo' },
    { fileName: 'WhatsApp Image 2026-03-09 at 19.07.16.jpeg', model: 'pia', stoneType: 'quartzo' }
];

const getImagePath = (fileName) => encodeURI(`Imagens/${fileName}`);

const normalizeFileName = (fileName) => {
    // Remove incremental suffixes like " (1)", " (2)" from o nome do arquivo
    const match = fileName.match(/^(.*?)(?: \(\d+\))?\.jpe?g$/i);
    return match ? match[1] : fileName;
};

const groupedCatalog = (() => {
    const groups = {};

    catalogItems.forEach(item => {
        const key = normalizeFileName(item.fileName);
        if (!groups[key]) {
            groups[key] = {
                key,
                items: [],
                model: item.model,
                stoneType: item.stoneType,
            };
        }
        groups[key].items.push(item);
    });

    return Object.values(groups);
})();

let currentGroup = null;
let currentIndex = 0;

const openModal = (groupKey, index) => {
    const group = groupedCatalog.find(g => g.key === groupKey);
    if (!group) return;

    currentGroup = group;
    currentIndex = index;
    const modal = document.getElementById('galleryModal');
    const modalImage = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalCaption');

    const item = group.items[currentIndex];
    modalImage.src = getImagePath(item.fileName);
    modalImage.alt = `${item.stoneType} - ${item.model}`;
    modalCaption.textContent = `${item.model.charAt(0).toUpperCase() + item.model.slice(1)} • ${item.stoneType.charAt(0).toUpperCase() + item.stoneType.slice(1)} — ${currentIndex + 1}/${group.items.length}`;

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
    currentIndex = (currentIndex + direction + currentGroup.items.length) % currentGroup.items.length;
    openModal(currentGroup.key, currentIndex);
};

const createCard = (group) => {
    const card = document.createElement('div');
    card.className = 'stone-card';

    const zoom = document.createElement('div');
    zoom.className = 'zoom-container';

    const img = document.createElement('img');
    img.src = getImagePath(group.items[0].fileName);
    img.alt = `${group.stoneType} - ${group.model}`;

    zoom.appendChild(img);
    card.appendChild(zoom);

    const info = document.createElement('div');
    info.className = 'stone-info';

    const title = document.createElement('h3');
    title.textContent = `${group.model.charAt(0).toUpperCase() + group.model.slice(1)} • ${group.stoneType.charAt(0).toUpperCase() + group.stoneType.slice(1)}`;

    const desc = document.createElement('p');
    desc.textContent = `${group.items.length} foto(s) similares. Clique para ver a coleção.`;

    info.appendChild(title);
    info.appendChild(desc);
    card.appendChild(info);

    card.addEventListener('click', () => openModal(group.key, 0));

    return card;
};

const renderCatalog = () => {
    const modelFilter = document.getElementById('modelFilter').value;
    const stoneTypeFilter = document.getElementById('stoneTypeFilter').value;
    const grid = document.getElementById('catalogGrid');

    grid.innerHTML = '';

    const filteredGroups = groupedCatalog.filter(group => {
        const modelMatch = modelFilter === 'all' || group.model === modelFilter;
        const stoneMatch = stoneTypeFilter === 'all' || group.stoneType === stoneTypeFilter;
        return modelMatch && stoneMatch;
    });

    if (!filteredGroups.length) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'Nenhuma pedra encontrada para os filtros selecionados.';
        emptyMessage.style.color = '#ddd';
        grid.appendChild(emptyMessage);
        return;
    }

    filteredGroups.forEach(group => grid.appendChild(createCard(group)));
};

window.addEventListener('DOMContentLoaded', () => {
    const modelFilter = document.getElementById('modelFilter');
    const stoneTypeFilter = document.getElementById('stoneTypeFilter');

    modelFilter.addEventListener('change', renderCatalog);
    stoneTypeFilter.addEventListener('change', renderCatalog);

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
        if (modal.classList.contains('open')) {
            if (event.key === 'Escape') closeModal();
            if (event.key === 'ArrowRight') navigateModal(1);
            if (event.key === 'ArrowLeft') navigateModal(-1);
        }
    });

    const hamburger = document.querySelector('.hamburger');
    const header = document.querySelector('header');
    const navLinks = document.querySelectorAll('nav a');

    const toggleMenu = () => {
        const isOpen = header.classList.toggle('nav-open');
        hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };

    hamburger.addEventListener('click', toggleMenu);
    navLinks.forEach(link => link.addEventListener('click', () => {
        if (header.classList.contains('nav-open')) {
            toggleMenu();
        }
    }));

    renderCatalog();
});

// Mensagem personalizada para o WhatsApp (opcional)
const whatsappButtons = document.querySelectorAll('a[href*="wa.me"]');
whatsappButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        // Você pode customizar a mensagem aqui se quiser
        const whatsappMessage = encodeURIComponent("Olá! Tenho interesse em orçamento para pedras e projetos de alto padrão.");
        const base = button.href.split('?')[0];
        button.href = `${base}?text=${whatsappMessage}`;
    });
});