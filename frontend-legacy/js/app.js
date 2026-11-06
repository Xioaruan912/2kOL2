/**
 * 2KOL2 Market Intelligence Frontend Application
 * Fully replicated 6-Tab deep player intelligence matching official WeChat Mini-Program
 */

const state = {
  mode: 'realtime', // 'realtime' or 'db'
  players: [],
  filteredPlayers: [],
  search: '',
  pos: '',
  sortBy: 'price',
  sortDesc: true,
  loading: false,
  activePlayerId: null,
  activeGrade: 7,
  priceChartInstance: null,
  radarChartInstance: null,
  activePlayerDetail: null
};

function formatPriceNumber(num) {
  if (num == null) return '--';
  return Number(num).toLocaleString('en-US');
}

function formatPriceShort(val) {
  const num = Number(val) || 0;
  if (num >= 1e8) return (num / 1e8).toFixed(2) + '亿';
  if (num >= 1e4) return (num / 1e4).toFixed(0) + '万';
  return num.toLocaleString();
}

document.addEventListener('DOMContentLoaded', () => {
  state.priceChartInstance = new PriceChart('priceCanvas');
  state.radarChartInstance = new RadarChart('radarCanvas');

  initEventListeners();
  loadPlayers();
  checkSyncStatus();
});

function initEventListeners() {
  // Mode toggles
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      state.mode = e.target.dataset.mode;
      loadPlayers();
    });
  });

  // Search input debounced
  let debounceTimer = null;
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.search = e.target.value.trim();
      if (state.mode === 'realtime' && state.search) {
        searchPlayersUpstream();
      } else {
        filterAndRender();
      }
    }, 350);
  });

  // Position filter pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      state.pos = e.target.dataset.pos || '';
      filterAndRender();
    });
  });

  // Modal Close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('playerModal').addEventListener('click', (e) => {
    if (e.target.id === 'playerModal') closeModal();
  });

  // Tab switching
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

      e.target.classList.add('active');
      const targetPanelId = e.target.dataset.tab;
      const targetPanel = document.getElementById(targetPanelId);
      if (targetPanel) targetPanel.classList.add('active');

      // Re-render chart if switching to tactics/price tab
      if (targetPanelId === 'tabTactics' && state.priceChartInstance) {
        setTimeout(() => state.priceChartInstance.render(), 50);
      }
      if (targetPanelId === 'tabOverview' && state.radarChartInstance && state.activePlayerDetail) {
        setTimeout(() => state.radarChartInstance.render(state.activePlayerDetail.Radar), 50);
      }
    });
  });

  // Breakthrough Grade change dropdown (1~7突)
  const gradeSelect = document.getElementById('gradeSelect');
  gradeSelect.addEventListener('change', (e) => {
    state.activeGrade = parseInt(e.target.value, 10) || 7;
    if (state.activePlayerId) {
      fetchAndRenderDetail(state.activePlayerId, state.activeGrade);
    }
  });

  // Tendency Category Filter Pills
  document.querySelectorAll('.tendency-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.tendency-pill').forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      renderTendencies(state.activePlayerDetail, e.target.dataset.cat);
    });
  });
}

async function checkSyncStatus() {
  try {
    const res = await API.getSyncStatus();
    const data = res.data || {};
    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    const dbTotal = data.db_total_players || 1469;
    if (data.is_syncing) {
      dot.style.backgroundColor = '#fbbf24';
      txt.textContent = '数据后台同步中...';
    } else {
      dot.style.backgroundColor = '#10b981';
      txt.textContent = `全量球星库已就绪 (${dbTotal}位)`;
    }
  } catch (err) {
    console.error('Failed to get status:', err);
  }
}

async function searchPlayersUpstream() {
  const grid = document.getElementById('playerGrid');
  grid.innerHTML = `<div class="state-box">正在向官方实时代理检索“${state.search}”...</div>`;
  state.loading = true;

  try {
    const t0 = performance.now();
    const res = await API.getPlayers({
      mode: 'realtime',
      keyword: state.search,
      pos: state.pos,
      sort_by: state.sortBy,
      desc: state.sortDesc,
      limit: 100
    });
    const elapsed = Math.round(performance.now() - t0);
    state.filteredPlayers = res.list || [];
    renderGrid(state.filteredPlayers);
    updateMetrics(elapsed, state.filteredPlayers);
  } catch (err) {
    grid.innerHTML = `<div class="state-box" style="color: var(--red);">实时检索失败: ${err.message}</div>`;
  } finally {
    state.loading = false;
  }
}

async function loadPlayers() {
  const grid = document.getElementById('playerGrid');
  grid.innerHTML = '<div class="state-box">正在加载 PC 端游全量球员库 (1469位)...</div>';
  state.loading = true;

  try {
    const t0 = performance.now();
    const res = await API.getPlayers({
      mode: state.mode,
      sort_by: state.sortBy,
      desc: state.sortDesc,
      limit: 1500
    });
    const elapsed = Math.round(performance.now() - t0);

    state.players = res.list || [];
    filterAndRender();
    updateMetrics(elapsed, state.players);
  } catch (err) {
    grid.innerHTML = `<div class="state-box" style="color: var(--red);">数据加载失败: ${err.message}</div>`;
  } finally {
    state.loading = false;
  }
}

function updateMetrics(elapsedMs = 0, currentList = []) {
  document.getElementById('metricTotal').textContent = state.players.length || currentList.length;

  const validList = currentList.length > 0 ? currentList : state.players;
  if (validList.length > 0) {
    const topPlayer = validList[0];
    document.getElementById('metricTopPrice').textContent = formatPriceShort(topPlayer.price);
    const ver = topPlayer.version ? ` (${String(topPlayer.version).slice(-2)})` : '';
    document.getElementById('metricTopPlayer').textContent = (topPlayer.showName || '球星') + ver;
  }

  document.getElementById('metricLatency').textContent = `${elapsedMs}ms`;
}

function filterAndRender() {
  let list = state.players;

  if (state.search) {
    const q = state.search.toLowerCase();
    list = list.filter(p => {
      const cn = (p.showName || p.show_name || '').toLowerCase();
      const en = (p.PlayerEnName || p.en_name || '').toLowerCase();
      const pid = String(p.playerId || p.player_id || '');
      return cn.includes(q) || en.includes(q) || pid.includes(q);
    });
  }

  if (state.pos) {
    list = list.filter(p => {
      const posStr = (p.Pos || p.pos || '').toUpperCase();
      return posStr.includes(state.pos.toUpperCase());
    });
  }

  state.filteredPlayers = list;
  renderGrid(list);
}

function renderGrid(players) {
  const grid = document.getElementById('playerGrid');
  if (!players.length) {
    grid.innerHTML = '<div class="state-box">未找到匹配的球员数据</div>';
    return;
  }

  grid.innerHTML = players.map(p => {
    const badges = p.badge_counts || {};
    const imgUrl = p.playerImg || p.player_img || 'https://game.gtimg.cn/images/nba2km/cp/nba2kmapp_assets/players/default.png';
    const pId = p.playerId || p.player_id || p.id;
    const pName = p.showName || p.show_name || '未知球员';
    const pPos = p.Pos || p.pos || 'C';
    const pSeries = p.cardSeries || p.card_series || '';
    const pOverall = p.overall || 0;
    const pPrice = p.price || 0;

    // Version label (e.g. 2006 -> 06, 1995 -> 95)
    let verLabel = '';
    const verNum = p.version || 0;
    if (verNum > 0) {
      verLabel = String(verNum).slice(-2);
    }

    const isLegend = pSeries.includes('致敬传奇');

    return `
      <div class="player-card" onclick="openPlayerDetail('${pId}')">
        <div class="card-left">
          <div class="player-avatar-wrap">
            <img class="player-avatar" src="${imgUrl}" alt="${pName}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%23262b36%22/></svg>'">
          </div>
          <div class="player-meta">
            <div class="player-name-row">
              <span class="player-name">${pName}</span>
              <span class="tag-pos">${pPos}</span>
              ${pSeries ? `<span class="tag-series ${isLegend ? 't-legend' : ''}">${pSeries}</span>` : ''}
            </div>
            <div class="badge-row">
              ${verLabel ? `<span class="tag-version">${verLabel}</span>` : ''}
              <div class="overall-crown">
                <span class="crown-icon">👑</span>
                <span>${pOverall}</span>
              </div>
              <div class="badge-hexes">
                ${badges['铜'] ? `<span class="hex-badge hex-bronze">${badges['铜']}</span>` : ''}
                ${badges['银'] ? `<span class="hex-badge hex-silver">${badges['银']}</span>` : ''}
                ${badges['金'] ? `<span class="hex-badge hex-gold">${badges['金']}</span>` : ''}
                ${badges['紫'] ? `<span class="hex-badge hex-purple">${badges['紫']}</span>` : ''}
              </div>
            </div>
          </div>
        </div>

        <div class="card-right-price">
          <div class="price-num">${formatPriceNumber(pPrice)}</div>
          <div class="price-sub">${formatPriceShort(pPrice)}</div>
        </div>
      </div>
    `;
  }).join('');
}

async function openPlayerDetail(playerId) {
  state.activePlayerId = playerId;
  state.activeGrade = 7;
  document.getElementById('gradeSelect').value = '7';

  const modal = document.getElementById('playerModal');
  modal.classList.add('open');

  // Reset to first tab (综合)
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('.tab-item[data-tab="tabOverview"]').classList.add('active');
  document.getElementById('tabOverview').classList.add('active');

  await fetchAndRenderDetail(playerId, state.activeGrade);
}

async function fetchAndRenderDetail(playerId, grade) {
  document.getElementById('heroName').textContent = '加载中...';

  try {
    const [priceRes, detailRes] = await Promise.all([
      API.getPriceHistory(playerId, 30),
      API.getPlayerDetail(playerId, grade)
    ]);

    const priceData = priceRes.data || {};
    const detailData = detailRes.data || {};
    state.activePlayerDetail = detailData;

    // Header info
    document.getElementById('heroAvatar').src = detailData.playerImg || '';
    document.getElementById('heroName').textContent = detailData.showName || '球星';
    document.getElementById('heroPosStyle').textContent = `${detailData.Pos || ''} ${detailData.PlayerSort || ''}`;
    document.getElementById('heroSeries').textContent = detailData.cardSeries || '现役';
    document.getElementById('heroHeightSpan').textContent = `身高 ${detailData.Height || '--'} | 臂展 ${detailData.Wingspan || '--'}`;
    document.getElementById('heroTeamSpan').textContent = `球队 ${detailData.teamAbbr || '--'}`;

    // Tab 1: Comprehensive
    document.getElementById('overviewOverallNum').textContent = detailData.OverAll || detailData.overall || '--';
    const badges = detailData.badge_counts || {};
    document.getElementById('overviewBadgeHexes').innerHTML = `
      ${badges['铜'] != null ? `<span class="hex-badge hex-bronze">${badges['铜']}</span>` : ''}
      ${badges['银'] != null ? `<span class="hex-badge hex-silver">${badges['银']}</span>` : ''}
      ${badges['金'] != null ? `<span class="hex-badge hex-gold">${badges['金']}</span>` : ''}
      ${badges['紫'] != null ? `<span class="hex-badge hex-purple">${badges['紫']}</span>` : ''}
    `;

    // Radar Chart
    if (detailData.Radar && state.radarChartInstance) {
      setTimeout(() => state.radarChartInstance.render(detailData.Radar), 50);
    }

    // Hotzone SVG
    document.getElementById('hotzoneCourtWrapper').innerHTML = HotzoneRenderer.renderCourtSvg(detailData.hotZone);

    // Tab 2: Attributes
    renderAttributes(detailData);

    // Tab 3: Badges
    renderBadges(detailData);

    // Tab 4: Animations & Shot Timings
    renderAnimations(detailData);

    // Tab 5: Tendencies
    renderTendencies(detailData, 'all');

    // Tab 6: Tactics & Price Trend
    renderTactics(detailData, priceData);

  } catch (err) {
    console.error('Failed to load player detail:', err);
  }
}

function renderAttributes(detail) {
  const container = document.getElementById('attributesList');
  let attrs = detail.Attribute || [];
  if (typeof attrs === 'string') {
    try { attrs = JSON.parse(attrs); } catch (e) { attrs = []; }
  }

  if (!attrs.length) {
    container.innerHTML = '<div class="state-box">暂无详细属性数据</div>';
    return;
  }

  container.innerHTML = attrs.map(item => {
    const val = item.value || 0;
    const colorClass = val >= 120 ? 'attr-high' : val >= 90 ? 'attr-mid' : '';
    return `
      <div class="attr-row">
        <span class="attr-name">${item.showName}</span>
        <span class="attr-val ${colorClass}">${val}</span>
      </div>
    `;
  }).join('');
}

function renderBadges(detail) {
  const container = document.getElementById('badgesList');
  const badges = detail.ActiveBadges || [];

  if (!badges.length) {
    container.innerHTML = '<div class="state-box">暂无徽章配置</div>';
    return;
  }

  container.innerHTML = badges.map(b => {
    const levelName = b.badgeLevel || '徽章';
    return `
      <div class="badge-item-card">
        <img class="badge-icon-img" src="${b.badgeImg || ''}" alt="${b.badgeName}">
        <div class="badge-info-col">
          <div class="badge-name-line">
            <span>${b.badgeName}</span>
            <span class="badge-tag-status">${b.isMax ? '已是最高' : levelName}</span>
          </div>
          <div class="badge-desc-text">${b.qualityDesc || ''}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderAnimations(detail) {
  // Shot timings
  const sb = detail.shotBase || {};
  document.getElementById('timeMeter').textContent = `${sb.meterSpeed || '--'} ms`;
  document.getElementById('timeRelease').textContent = `${sb.releaseSpeed || '--'} ms`;
  document.getElementById('timeOverall').textContent = `${sb.overallSpeed || '--'} ms`;

  // Animation Styles
  const container = document.getElementById('animationsList');
  const anims = detail.animations || {};
  const entries = Object.entries(anims);

  if (!entries.length) {
    container.innerHTML = '<div class="state-box">暂无动作包数据</div>';
    return;
  }

  container.innerHTML = entries.map(([key, val]) => `
    <div class="attr-row">
      <span class="attr-name style-badge-tag">${key}</span>
      <span class="attr-val" style="font-size:13px; font-weight:600;">${val}</span>
    </div>
  `).join('');
}

function renderTendencies(detail, category = 'all') {
  const container = document.getElementById('tendenciesGrid');
  let list = [];

  // Look in otherAttributes.tendencies_data
  const hidden = detail.hiddenAttributes || {};
  const other = hidden.otherAttributes || {};
  const tData = other.tendencies_data || [];

  if (tData.length > 0) {
    const obj = tData[0];
    list = Object.entries(obj).map(([name, val]) => ({ name, value: val }));
  } else if (Array.isArray(detail.Tendency)) {
    list = detail.Tendency.map(t => ({ name: t.showName, value: t.value }));
  }

  if (category !== 'all') {
    list = list.filter(item => item.name.includes(category));
  }

  if (!list.length) {
    container.innerHTML = '<div class="state-box">该分类暂无倾向数据</div>';
    return;
  }

  container.innerHTML = list.map(item => `
    <div class="tendency-item">
      <span style="color:#d1d5db;">${item.name}</span>
      <strong style="color:${item.value >= 80 ? '#f59e0b' : '#fff'};">${item.value}</strong>
    </div>
  `).join('');
}

function renderTactics(detail, priceData) {
  // Tactics from tacticsList
  document.getElementById('tacticIsBallHandler').textContent = detail.isPrimaryBallHandler || '否';

  const tList = detail.tacticsList || [];
  document.getElementById('tacticType1').textContent = tList[0] ? tList[0].name : '--';
  document.getElementById('tacticType2').textContent = tList[1] ? tList[1].name : '--';
  document.getElementById('tacticType3').textContent = tList[2] ? tList[2].name : '--';
  document.getElementById('tacticType4').textContent = tList[3] ? tList[3].name : '--';

  // Price Trend Stats
  const change7d = priceData.price_change_7d_pct;
  const change30d = priceData.price_change_30d_pct;

  const el7d = document.getElementById('modal7dChange');
  el7d.textContent = (change7d != null ? (change7d >= 0 ? '+' : '') + change7d.toFixed(2) + '%' : '--');
  el7d.style.color = change7d > 0 ? '#ef4444' : change7d < 0 ? '#10b981' : '#fff';

  const el30d = document.getElementById('modal30dChange');
  el30d.textContent = (change30d != null ? (change30d >= 0 ? '+' : '') + change30d.toFixed(2) + '%' : '--');
  el30d.style.color = change30d > 0 ? '#ef4444' : change30d < 0 ? '#10b981' : '#fff';

  // Render Canvas Chart
  const history = priceData.price_history || [];
  if (state.priceChartInstance) {
    state.priceChartInstance.setData(history);
  }
}

function closeModal() {
  document.getElementById('playerModal').classList.remove('open');
}
