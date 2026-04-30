// Popular Tab Frontend Module
'use strict';

const SOURCE_ICONS = {
  'TPB':           { icon: '🏴‍☠️', color: '#3b82f6' },
  '1337x':         { icon: '🔥', color: '#ef4444' },
  'YTS':           { icon: '🎬', color: '#22c55e' },
  'EZTV':          { icon: '📺', color: '#8b5cf6' },
  'Nyaa':          { icon: '🌸', color: '#ec4899' },
  'TGx':           { icon: '🌌', color: '#06b6d4' },
  'LimeTorrents':  { icon: '🍋', color: '#84cc16' },
  'SolidTorrents': { icon: '💎', color: '#f97316' },
  'AudioBookBay':  { icon: '📚', color: '#a78bfa' },
};

const CATEGORIES = [
  { label: 'All',             key: 'all' },
  { label: 'Movies',          key: 'movies' },
  { label: 'TV',              key: 'tv' },
  { label: 'Music',           key: 'music' },
  { label: 'Games',           key: 'games' },
  { label: 'Software',        key: 'software' },
  { label: 'Anime',           key: 'anime' },
  { label: 'Ebooks',          key: 'ebooks' },
  { label: 'Audiobooks',      key: 'audiobooks' },
  { label: 'Cartoons',        key: 'cartoons' },
  { label: 'Balkan',          key: 'balkan' },
  { label: 'Balkan-Cartoons', key: 'balkan-cartoons' },
];

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getSourceIcon(source) {
  return SOURCE_ICONS[source] || { icon: '🔗', color: '#64748b' };
}

function formatNum(n) {
  if (!n || n === 0) return '0';
  return Number(n).toLocaleString();
}

// === DOM helpers ===

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderPills(container, activeKey) {
  container.textContent = '';
  CATEGORIES.forEach(cat => {
    const btn = el('button', 'cat-btn' + (cat.key === activeKey ? ' active' : ''), cat.label);
    btn.addEventListener('click', () => window.showPopular(cat.key));
    container.appendChild(btn);
  });
}

function showSpinner(section) {
  section.textContent = '';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'text-align:center;padding:60px 0';
  const spinner = el('div', 'spinner');
  spinner.style.margin = '0 auto';
  wrap.appendChild(spinner);
  const txt = el('p', 'loading-text', 'Loading popular torrents…');
  txt.style.marginTop = '16px';
  wrap.appendChild(txt);
  section.appendChild(wrap);
}

function showMessage(section, text) {
  section.textContent = '';
  const p = document.createElement('div');
  p.style.cssText = 'text-align:center;padding:40px 20px;color:var(--text-muted)';
  p.textContent = text;
  section.appendChild(p);
}

function renderMeta(section, result, category) {
  const metaRow = document.createElement('div');
  metaRow.className = 'popular-meta';
  metaRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px;font-size:0.85rem;color:var(--text-muted)';

  if (result.fetchedAt) {
    metaRow.appendChild(el('span', null, `Last refreshed ${timeAgo(result.fetchedAt)}`));
    metaRow.appendChild(el('span', null, '·'));

    const refreshBtn = el('button', 'back-btn', '🔄 Refresh');
    refreshBtn.style.cssText = 'padding:4px 10px;font-size:0.8rem';
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.textContent = 'Refreshing…';
      refreshBtn.disabled = true;
      try {
        await fetch(`/api/popular/${category}/refresh`, { method: 'POST' });
      } catch (_) {
        refreshBtn.disabled = false;
        refreshBtn.textContent = '🔄 Refresh';
      }
      window.showPopular(category);
    });
    metaRow.appendChild(refreshBtn);
  }

  if (result.status === 'stale') {
    const staleNote = el('span', null, '⏳ Refreshing in background…');
    staleNote.style.cssText = 'color:var(--orange);margin-left:8px';
    metaRow.appendChild(staleNote);
  }

  section.appendChild(metaRow);
}

function buildRankCell(rank) {
  const td = document.createElement('td');
  td.textContent = String(rank);
  td.style.cssText = 'font-weight:700;text-align:center';
  if (rank <= 3) td.style.color = 'var(--green)';
  return td;
}

function buildNameCell(item) {
  const td = el('td', 'torrent-name');
  td.title = item.name || '';
  td.appendChild(el('span', null, item.name || '(unknown)'));
  return td;
}

function buildSeedsCell(item) {
  const td = el('td', 'col-seeds');
  td.appendChild(el('span', 'seeds', formatNum(item.seeds)));
  return td;
}

function buildLeechCell(item) {
  const td = el('td', 'col-leechers');
  const span = el('span', 'leechers', formatNum(item.leechers));
  span.style.color = 'var(--orange)';
  td.appendChild(span);
  return td;
}

function buildCombinedCell(item) {
  const combined = (item.seeds || 0) + (item.leechers || 0);
  const td = document.createElement('td');
  td.textContent = formatNum(combined);
  td.style.color = 'var(--text-secondary)';
  return td;
}

function buildSourceCell(item) {
  const td = document.createElement('td');
  const meta = getSourceIcon(item.source);
  const badge = el('span', 'source-icon', meta.icon);
  badge.title = item.source || '';
  badge.style.borderColor = meta.color;
  td.appendChild(badge);
  return td;
}

function buildActionCell(item) {
  const td = document.createElement('td');
  const wrap = el('div', 'action-btns');
  if (item.magnet) {
    const magnet = el('a', 'magnet-btn', '🧲 Magnet');
    magnet.href = item.magnet;
    magnet.title = 'Open magnet link';
    wrap.appendChild(magnet);
  }
  td.appendChild(wrap);
  return td;
}

function renderTable(section, items) {
  const wrapper = el('div', 'table-wrapper');
  const table = el('table', 'results-table');
  table.style.minWidth = '700px';

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['#', 'Name', 'Seeds', 'Leechers', 'Combined', 'Source', 'Actions'].forEach(col => {
    hr.appendChild(el('th', null, col));
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  items.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.appendChild(buildRankCell(idx + 1));
    tr.appendChild(buildNameCell(item));
    tr.appendChild(buildSeedsCell(item));
    tr.appendChild(buildLeechCell(item));
    tr.appendChild(buildCombinedCell(item));
    tr.appendChild(buildSourceCell(item));
    tr.appendChild(buildActionCell(item));
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);
  section.appendChild(wrapper);
}

function buildSectionTitle() {
  const h2 = el('h2', 'rankings-title');
  h2.appendChild(document.createTextNode('🔥 Popular '));
  const accent = el('span', 'accent', 'Right Now');
  h2.appendChild(accent);
  return h2;
}

// === Entry point ===

window.showPopular = async function showPopular(category) {
  category = category || 'all';

  const popularSection = document.getElementById('popularSection');
  if (!popularSection) return;

  const searchSection = document.getElementById('searchSection');
  const resultsSection = document.getElementById('resultsSection');
  const rankingsSection = document.getElementById('rankingsSection');
  if (searchSection) searchSection.style.display = 'none';
  if (resultsSection) resultsSection.style.display = 'none';
  if (rankingsSection) rankingsSection.style.display = 'none';

  popularSection.style.display = 'block';

  popularSection.textContent = '';
  popularSection.appendChild(buildSectionTitle());

  const pillsContainer = el('div', 'categories');
  pillsContainer.style.marginBottom = '24px';
  renderPills(pillsContainer, category);
  popularSection.appendChild(pillsContainer);

  const contentArea = document.createElement('div');
  popularSection.appendChild(contentArea);

  showSpinner(contentArea);

  let result;
  try {
    const resp = await fetch(`/api/popular/${category}`);
    if (!resp.ok) throw new Error(resp.statusText);
    result = await resp.json();
  } catch (_) {
    showMessage(contentArea, 'Unable to load popular torrents — try refreshing');
    return;
  }

  contentArea.textContent = '';

  if (result.status === 'no-data') {
    showMessage(contentArea, 'No popularity data available for this category');
    return;
  }

  const items = Array.isArray(result.data) ? result.data : [];
  if (items.length === 0) {
    showMessage(contentArea, 'Unable to load popular torrents — try refreshing');
    return;
  }

  renderMeta(contentArea, result, category);
  renderTable(contentArea, items);
};
