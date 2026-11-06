/**
 * 2KOL2 Intelligence API Client
 */
const API = {
  baseUrl: window.location.origin,

  async getPlayers(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${this.baseUrl}/api/players?${query}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async getPlayerDetail(playerId, grade = 6) {
    const res = await fetch(`${this.baseUrl}/api/player/${playerId}?grade=${grade}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async getPriceHistory(playerId, days = 30) {
    const res = await fetch(`${this.baseUrl}/api/player/${playerId}/price-history?days=${days}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async getSyncStatus() {
    const res = await fetch(`${this.baseUrl}/api/sync/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async triggerSync(topN = 50) {
    const res = await fetch(`${this.baseUrl}/api/sync/trigger?top_n=${topN}`, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }
};
