// UltimateTracker Frontend
(function () {
  'use strict';

  // Source icons/colors mapping
  const SOURCE_META = {
    'The Pirate Bay': { icon: '🏴‍☠️', color: '#2ecc71' },
    '1337x': { icon: '🔥', color: '#e74c3c' },
    'YTS': { icon: '🎬', color: '#f1c40f' },
    'EZTV': { icon: '📺', color: '#3498db' },
    'Nyaa': { icon: '⛩️', color: '#9b59b6' },
    'TorrentGalaxy': { icon: '🌌', color: '#e67e22' },
    'LimeTorrents': { icon: '🍋', color: '#27ae60' },
    'SolidTorrents': { icon: '💎', color: '#2980b9' },
    'Library Genesis': { icon: '📚', color: '#8e44ad' },
    'KickassTorrents': { icon: '🦶', color: '#c0392b' },
    'GloDLS': { icon: '🌍', color: '#16a085' },
    'TorrentDownloads': { icon: '⬇️', color: '#d35400' },
    'AniDex': { icon: '🎌', color: '#e91e63' },
    'BTDig': { icon: '🔍', color: '#607d8b' },
    'Balkan Search': { icon: '🇭🇷', color: '#0d47a1' },
    'Balkan (1337x)': { icon: '🇭🇷', color: '#1565c0' },
    'Balkan (TPB)': { icon: '🇭🇷', color: '#1976d2' },
    'BalkanDownload': { icon: '🇧🇦', color: '#0d47a1' },
    'CroTorrents': { icon: '🇭🇷', color: '#d32f2f' },
    'AudioBookBay': { icon: '🎧', color: '#ff6f00' },
  };

  function getSourceMeta(name) {
    return SOURCE_META[name] || { icon: '🔗', color: '#64748b' };
  }

  // State
  let allResults = [];
  let filteredResults = [];
  let currentSort = { key: 'seeds', dir: 'desc' };
  let activeCategory = 'all';
  let activeSources = new Set();
  let searchHistory = JSON.parse(localStorage.getItem('ut_history') || '[]');
  let categories = [];
  let currentEventSource = null;

  // Page navigation
  const navSearch = document.getElementById('navSearch');
  const navRankings = document.getElementById('navRankings');
  const rankingsSection = document.getElementById('rankingsSection');
  const rankingTypes = document.getElementById('rankingTypes');
  const rankingProgress = document.getElementById('rankingProgress');
  const rankingProgressTitle = document.getElementById('rankingProgressTitle');
  const rankingProgressBar = document.getElementById('rankingProgressBar');
  const rankingStats = document.getElementById('rankingStats');
  const rankingResults = document.getElementById('rankingResults');
  const rankingResultsHeader = document.getElementById('rankingResultsHeader');
  const rankingGrid = document.getElementById('rankingGrid');
  let rankingEventSource = null;

  // DOM refs
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const clearBtn = document.getElementById('clearBtn');
  const autocomplete = document.getElementById('autocomplete');
  const categoriesEl = document.getElementById('categories');
  const searchSection = document.getElementById('searchSection');
  const resultsSection = document.getElementById('resultsSection');
  const resultsBody = document.getElementById('resultsBody');
  const resultCount = document.getElementById('resultCount');
  const searchTime = document.getElementById('searchTime');
  const errorToggle = document.getElementById('errorToggle');
  const errorDivider = document.getElementById('errorDivider');
  const errorCount = document.getElementById('errorCount');
  const errorPanel = document.getElementById('errorPanel');
  const errorList = document.getElementById('errorList');
  const noResults = document.getElementById('noResults');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingSources = document.getElementById('loadingSources');
  const sourceFilters = document.getElementById('sourceFilters');
  const backBtn = document.getElementById('backBtn');
  const tableWrapper = document.querySelector('.table-wrapper');

  // Init
  async function init() {
    try {
      const resp = await fetch('/api/categories');
      categories = await resp.json();
    } catch (e) {
      categories = [{ id: 'all', name: 'All', icon: '🌐' }];
    }
    renderCategories();
    setupEvents();
  }

  function renderCategories() {
    categoriesEl.innerHTML = categories.map(c =>
      `<button class="cat-btn${c.id === activeCategory ? ' active' : ''}" data-cat="${c.id}">
        <span>${c.icon}</span> ${c.name}
      </button>`
    ).join('');
  }

  function setupEvents() {
    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { autocomplete.classList.remove('visible'); doSearch(); }
      if (e.key === 'Escape') autocomplete.classList.remove('visible');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { navigateAutocomplete(e.key === 'ArrowDown' ? 1 : -1); e.preventDefault(); }
    });
    searchInput.addEventListener('input', () => {
      clearBtn.classList.toggle('visible', searchInput.value.length > 0);
      showAutocomplete();
    });
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.classList.remove('visible');
      searchInput.focus();
      autocomplete.classList.remove('visible');
    });
    categoriesEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-btn');
      if (!btn) return;
      const newCat = btn.dataset.cat;
      const changed = activeCategory !== newCat;
      activeCategory = newCat;
      categoriesEl.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Auto re-search if there's a query and category changed
      if (changed && searchInput.value.trim()) doSearch();
    });
    document.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (currentSort.key === key) {
          currentSort.dir = currentSort.dir === 'desc' ? 'asc' : 'desc';
        } else {
          currentSort.key = key;
          currentSort.dir = key === 'name' || key === 'source' || key === 'date' ? 'asc' : 'desc';
        }
        updateSortArrows();
        sortAndRender();
      });
    });
    backBtn.addEventListener('click', () => {
      if (currentEventSource) { currentEventSource.close(); currentEventSource = null; }
      resultsSection.style.display = 'none';
      searchSection.classList.remove('compact');
      loadingOverlay.style.display = 'none';
      searchInput.focus();
    });
    errorToggle.addEventListener('click', () => {
      errorPanel.style.display = errorPanel.style.display === 'none' ? 'block' : 'none';
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) autocomplete.classList.remove('visible');
    });
    searchInput.addEventListener('focus', showAutocomplete);
  }

  function showAutocomplete() {
    const val = searchInput.value.trim().toLowerCase();
    let items = val.length === 0
      ? searchHistory.slice(0, 8).map(h => ({ text: h, icon: '🕐' }))
      : searchHistory.filter(h => h.toLowerCase().includes(val)).slice(0, 5).map(h => ({ text: h, icon: '🕐' }));
    if (items.length === 0) { autocomplete.classList.remove('visible'); return; }
    autocomplete.innerHTML = items.map((item, i) =>
      `<div class="autocomplete-item" data-index="${i}" data-text="${escapeHtml(item.text)}">
        <span class="ac-icon">${item.icon}</span>
        <span>${highlightMatch(item.text, val)}</span>
      </div>`
    ).join('');
    autocomplete.querySelectorAll('.autocomplete-item').forEach(el => {
      el.addEventListener('click', () => {
        searchInput.value = el.dataset.text;
        autocomplete.classList.remove('visible');
        clearBtn.classList.add('visible');
        doSearch();
      });
    });
    autocomplete.classList.add('visible');
  }

  function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const lower = text.toLowerCase();
    const idx = lower.indexOf(query);
    if (idx === -1) return escapeHtml(text);
    return escapeHtml(text.substring(0, idx)) +
      `<strong>${escapeHtml(text.substring(idx, idx + query.length))}</strong>` +
      escapeHtml(text.substring(idx + query.length));
  }

  function navigateAutocomplete(dir) {
    const items = autocomplete.querySelectorAll('.autocomplete-item');
    if (!items.length) return;
    const active = autocomplete.querySelector('.autocomplete-item.active');
    let idx = active ? parseInt(active.dataset.index) + dir : (dir === 1 ? 0 : items.length - 1);
    idx = Math.max(0, Math.min(items.length - 1, idx));
    items.forEach(i => i.classList.remove('active'));
    items[idx].classList.add('active');
    searchInput.value = items[idx].dataset.text;
  }

  async function doSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    if (currentEventSource) { currentEventSource.close(); currentEventSource = null; }

    // Save history
    searchHistory = searchHistory.filter(h => h !== query);
    searchHistory.unshift(query);
    searchHistory = searchHistory.slice(0, 30);
    localStorage.setItem('ut_history', JSON.stringify(searchHistory));
    autocomplete.classList.remove('visible');

    // Reset
    allResults = [];
    activeSources.clear();
    const errors = [];
    const startTime = performance.now();

    // UI setup
    searchSection.classList.add('compact');
    resultsSection.style.display = 'block';
    loadingOverlay.style.display = 'flex';
    loadingSources.innerHTML = '<div class="loading-text-sm">Connecting to sources...</div>';
    noResults.style.display = 'none';
    tableWrapper.style.display = 'none';
    resultsBody.innerHTML = '';
    sourceFilters.innerHTML = '';
    errorPanel.style.display = 'none';
    errorToggle.style.display = 'none';
    errorDivider.style.display = 'none';
    resultCount.textContent = '0 results';
    searchTime.textContent = '0.00s';

    // SSE
    const url = `/api/search?q=${encodeURIComponent(query)}&category=${activeCategory}`;
    const es = new EventSource(url);
    currentEventSource = es;
    let sourceMap = {};

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'sources') {
        sourceMap = {};
        data.sources.forEach(s => { sourceMap[s.key] = s; });
        renderSourceProgress(sourceMap);
      }

      if (data.type === 'source-done') {
        sourceMap[data.key] = {
          ...sourceMap[data.key],
          status: data.status,
          count: data.count || 0,
          error: data.error,
        };

        if (data.status === 'success' && data.results) {
          allResults.push(...data.results);
          currentSort = { key: 'seeds', dir: 'desc' };
          updateSortArrows();
          sortAndRender();
          if (allResults.length > 0) {
            tableWrapper.style.display = 'block';
            noResults.style.display = 'none';
          }
        }
        if (data.status === 'error') {
          errors.push(`${data.name}: ${data.error}`);
        }

        renderSourceProgress(sourceMap);
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        resultCount.textContent = `${allResults.length} results`;
        searchTime.textContent = `${elapsed}s`;
      }

      if (data.type === 'done') {
        es.close();
        currentEventSource = null;
        loadingOverlay.style.display = 'none';

        const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        resultCount.textContent = `${allResults.length} results`;
        searchTime.textContent = `${elapsed}s`;

        if (errors.length > 0) {
          errorToggle.style.display = 'inline-flex';
          errorDivider.style.display = 'inline';
          errorCount.textContent = errors.length;
          errorList.innerHTML = errors.map(e => `<div>• ${e}</div>`).join('');
        }
        buildSourceFilters();
        if (allResults.length === 0) {
          noResults.style.display = 'block';
          tableWrapper.style.display = 'none';
        }
      }
    };

    es.onerror = () => {
      es.close();
      currentEventSource = null;
      loadingOverlay.style.display = 'none';
      if (allResults.length === 0) {
        noResults.style.display = 'block';
        tableWrapper.style.display = 'none';
      }
      buildSourceFilters();
    };
  }

  function renderSourceProgress(sourceMap) {
    const sources = Object.values(sourceMap);
    const done = sources.filter(s => s.status !== 'searching').length;
    const total = sources.length;

    loadingSources.innerHTML = `
      <div class="progress-header">${done} / ${total} sources completed</div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width:${total > 0 ? (done/total)*100 : 0}%"></div>
      </div>
      <div class="source-progress-grid">
        ${sources.map(s => {
          const meta = getSourceMeta(s.name);
          let statusClass = 'sp-searching';
          let statusText = 'Searching...';
          if (s.status === 'success') { statusClass = 'sp-success'; statusText = `✓ ${s.count} found`; }
          if (s.status === 'error') { statusClass = 'sp-error'; statusText = '✗ Failed'; }
          return `<div class="source-progress-item ${statusClass}">
            <span class="sp-icon">${meta.icon}</span>
            <span class="sp-name">${s.name}</span>
            <span class="sp-status">${statusText}</span>
          </div>`;
        }).join('')}
      </div>
    `;
  }

  function buildSourceFilters() {
    const sourceCounts = {};
    allResults.forEach(r => { sourceCounts[r.source] = (sourceCounts[r.source] || 0) + 1; });
    const sources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);

    sourceFilters.innerHTML =
      `<button class="source-chip active" data-source="all">All <span class="chip-count">${allResults.length}</span></button>` +
      sources.map(([source, count]) => {
        const meta = getSourceMeta(source);
        return `<button class="source-chip" data-source="${source}">
          <span>${meta.icon}</span> ${source} <span class="chip-count">${count}</span>
        </button>`;
      }).join('');

    sourceFilters.querySelectorAll('.source-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const src = chip.dataset.source;
        if (src === 'all') {
          activeSources.clear();
          sourceFilters.querySelectorAll('.source-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
        } else {
          sourceFilters.querySelector('[data-source="all"]').classList.remove('active');
          chip.classList.toggle('active');
          if (chip.classList.contains('active')) activeSources.add(src);
          else activeSources.delete(src);
          if (activeSources.size === 0) sourceFilters.querySelector('[data-source="all"]').classList.add('active');
        }
        sortAndRender();
      });
    });
  }

  function sortAndRender() {
    filteredResults = activeSources.size > 0
      ? allResults.filter(r => activeSources.has(r.source))
      : [...allResults];

    filteredResults.sort((a, b) => {
      let aVal = a[currentSort.key], bVal = b[currentSort.key];
      if (currentSort.key === 'size') { aVal = a.sizeBytes || 0; bVal = b.sizeBytes || 0; }
      if (typeof aVal === 'string') {
        return currentSort.dir === 'asc'
          ? (aVal || '').toLowerCase().localeCompare((bVal || '').toLowerCase())
          : (bVal || '').toLowerCase().localeCompare((aVal || '').toLowerCase());
      }
      aVal = aVal || 0; bVal = bVal || 0;
      return currentSort.dir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    renderResults();
  }

  function renderResults() {
    if (filteredResults.length === 0 && !currentEventSource) {
      noResults.style.display = 'block';
      tableWrapper.style.display = 'none';
      return;
    }
    if (filteredResults.length === 0) return;

    noResults.style.display = 'none';
    tableWrapper.style.display = 'block';

    const fragment = document.createDocumentFragment();
    filteredResults.forEach(r => {
      const tr = document.createElement('tr');
      const isBalkan = r.name.includes('[BALKAN]') || r.name.includes('[CRO]') || r.source.includes('Balkan');
      const displayName = r.name.replace('[BALKAN] ', '').replace('[CRO] ', '');
      const meta = getSourceMeta(r.source);

      tr.innerHTML = `
        <td class="torrent-name" title="${escapeAttr(r.name)}">
          ${isBalkan ? '<span class="balkan-tag">HR</span>' : ''}
          <a href="${escapeAttr(r.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(displayName)}</a>
        </td>
        <td class="size-col">${escapeHtml(r.size)}</td>
        <td class="col-seeds"><span class="${r.seeds > 0 ? 'seeds' : 'seeds-zero'}">${formatNumber(r.seeds)}</span></td>
        <td class="col-leechers"><span class="leechers">${formatNumber(r.leechers)}</span></td>
        <td class="date-col">${escapeHtml(r.date)}</td>
        <td>
          <span class="source-icon" title="${escapeAttr(r.source)}" style="border-color:${meta.color}">
            ${meta.icon}
          </span>
        </td>
        <td>
          <div class="action-btns">
            ${r.magnet
              ? `<a class="magnet-btn" href="${escapeAttr(r.magnet)}" title="Open magnet link">🧲 Magnet</a>`
              : `<a class="link-btn" href="${escapeAttr(r.sourceUrl)}" target="_blank" rel="noopener" title="Go to source">🔗 Source</a>`
            }
          </div>
        </td>
      `;
      fragment.appendChild(tr);
    });

    resultsBody.innerHTML = '';
    resultsBody.appendChild(fragment);
    resultCount.textContent = `${filteredResults.length} results${activeSources.size > 0 ? ' (filtered)' : ''}`;
  }

  function updateSortArrows() {
    document.querySelectorAll('th.sortable').forEach(th => {
      const arrow = th.querySelector('.sort-arrow');
      const isActive = th.dataset.sort === currentSort.key;
      th.classList.toggle('active', isActive);
      arrow.textContent = isActive ? (currentSort.dir === 'desc' ? '▼' : '▲') : '';
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatNumber(n) {
    if (!n || n === 0) return '0';
    return n.toLocaleString();
  }

  // === Rankings ===
  function setupNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (page === 'search') {
          searchSection.style.display = '';
          resultsSection.style.display = allResults.length > 0 ? 'block' : 'none';
          rankingsSection.style.display = 'none';
          document.getElementById('popularSection').style.display = 'none';
          if (rankingEventSource) { rankingEventSource.close(); rankingEventSource = null; }
        } else if (page === 'rankings') {
          searchSection.style.display = 'none';
          resultsSection.style.display = 'none';
          rankingsSection.style.display = 'block';
          document.getElementById('popularSection').style.display = 'none';
          loadRankingTypes();
        } else if (page === 'popular') {
          searchSection.style.display = 'none';
          resultsSection.style.display = 'none';
          rankingsSection.style.display = 'none';
          showPopular(null);
        }
      });
    });
  }

  async function loadRankingTypes() {
    try {
      const resp = await fetch('/api/rankings/types');
      const types = await resp.json();
      rankingTypes.innerHTML = types.map(t =>
        `<div class="ranking-type-card" data-type="${t.id}">
          <div class="ranking-type-icon">${t.icon}</div>
          <div class="ranking-type-title">${escapeHtml(t.title)}</div>
          <div class="ranking-type-count">${t.count} items</div>
        </div>`
      ).join('');

      rankingTypes.querySelectorAll('.ranking-type-card').forEach(card => {
        card.addEventListener('click', () => {
          rankingTypes.querySelectorAll('.ranking-type-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          loadRanking(card.dataset.type);
        });
      });
    } catch (e) {
      rankingTypes.innerHTML = '<p style="color:var(--text-muted)">Failed to load ranking types</p>';
    }
  }

  function loadRanking(type) {
    if (rankingEventSource) { rankingEventSource.close(); rankingEventSource = null; }

    rankingProgress.style.display = 'block';
    rankingResults.style.display = 'block';
    rankingProgressBar.style.width = '0%';
    rankingStats.textContent = 'Starting...';
    rankingGrid.innerHTML = '';
    rankingResultsHeader.innerHTML = '';

    const items = []; // collect results for sorting
    const skipped = []; // collect skipped titles

    const es = new EventSource(`/api/rankings/${type}`);
    rankingEventSource = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'info') {
        rankingProgressTitle.textContent = `${data.icon} ${data.title}`;
      }

      if (data.type === 'result') {
        const { rank, queryTitle, torrent, progress } = data;
        items.push({ rank, queryTitle, torrent });
        updateRankingProgress(progress);
        renderRankingGrid(items, skipped);
      }

      if (data.type === 'skip') {
        skipped.push({ rank: data.rank, title: data.queryTitle });
        updateRankingProgress(data.progress);
      }

      if (data.type === 'done') {
        es.close();
        rankingEventSource = null;
        rankingProgress.style.display = 'none';
        rankingResultsHeader.innerHTML = `
          <h3>${rankingProgressTitle.textContent}</h3>
          <span class="ranking-found">${items.length} torrents found</span>
        `;
        renderRankingGrid(items, skipped);
      }
    };

    es.onerror = () => {
      es.close();
      rankingEventSource = null;
      rankingProgress.style.display = 'none';
    };
  }

  function updateRankingProgress(progress) {
    const pct = progress.total > 0 ? (progress.processed / progress.total) * 100 : 0;
    rankingProgressBar.style.width = `${pct}%`;
    rankingStats.textContent = `${progress.processed} / ${progress.total} processed — ${progress.found} found`;
  }

  function renderRankingGrid(items, skipped = []) {
    // Sort by rank
    const sorted = [...items].sort((a, b) => a.rank - b.rank);
    let html = sorted.map(({ rank, queryTitle, torrent }) => `
      <div class="ranking-item">
        <div class="ranking-rank">#${rank}</div>
        <div class="ranking-info">
          <div class="ranking-query">${escapeHtml(queryTitle)}</div>
          <div class="ranking-torrent-name">
            <a href="${escapeAttr(torrent.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(torrent.name)}</a>
          </div>
        </div>
        <div class="ranking-size">${escapeHtml(torrent.size)}</div>
        <div class="ranking-seeds">▲ ${formatNumber(torrent.seeds)}</div>
        <div class="ranking-actions">
          ${torrent.magnet
            ? `<a href="${escapeAttr(torrent.magnet)}" title="Magnet link">🧲 Magnet</a>`
            : `<a href="${escapeAttr(torrent.sourceUrl)}" target="_blank" rel="noopener">🔗 Source</a>`
          }
        </div>
      </div>
    `).join('');

    if (skipped.length > 0) {
      html += `
        <details class="ranking-skipped">
          <summary>${skipped.length} items not found (no torrent available)</summary>
          <ul>${[...skipped].sort((a, b) => a.rank - b.rank).map(s => `<li><span class="skipped-rank">#${s.rank}</span> ${escapeHtml(s.title)}</li>`).join('')}</ul>
        </details>
      `;
    }

    rankingGrid.innerHTML = html;
  }

  init();
  setupNav();
})();
