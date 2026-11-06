/**
 * 2KOL2 High-Performance Canvas Graphics Engines:
 * 1. PriceChart: 60fps interactive 30-day price trend chart
 * 2. RadarChart: 11-dimension spider web ability chart
 * 3. HotzoneRenderer: Basketball half-court 14-district heat map
 */

class PriceChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.data = [];
    this.hoverIndex = -1;
    this.initEvents();
  }

  setData(data) {
    this.data = data || [];
    this.render();
  }

  initEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.data.length) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const step = rect.width / (this.data.length - 1 || 1);
      const idx = Math.round(x / step);
      this.hoverIndex = Math.max(0, Math.min(idx, this.data.length - 1));
      this.render();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverIndex = -1;
      this.render();
    });
  }

  render() {
    if (!this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio || 600;
    const h = this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio || 220;
    ctx.clearRect(0, 0, w, h);

    if (!this.data.length) {
      ctx.fillStyle = '#5c6374';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无 30 天身价走势点位数据', w / 2, h / 2);
      return;
    }

    const padding = { top: 30, right: 30, bottom: 40, left: 60 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const prices = this.data.map(d => d.price);
    const minP = Math.min(...prices) * 0.95;
    const maxP = Math.max(...prices) * 1.05 || 1;

    const getX = (i) => padding.left + (i / (this.data.length - 1 || 1)) * chartW;
    const getY = (val) => padding.top + chartH - ((val - minP) / (maxP - minP || 1)) * chartH;

    // Grid Lines
    ctx.strokeStyle = '#232938';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      const val = maxP - ((maxP - minP) / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      let valStr = val >= 1e8 ? (val / 1e8).toFixed(1) + '亿' : (val / 1e4).toFixed(0) + '万';
      ctx.fillText(valStr, padding.left - 8, y + 4);
    }

    // Gradient fill under curve
    const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    gradient.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
    gradient.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(prices[0]));
    for (let i = 1; i < this.data.length; i++) {
      ctx.lineTo(getX(i), getY(prices[i]));
    }
    ctx.lineTo(getX(this.data.length - 1), h - padding.bottom);
    ctx.lineTo(getX(0), h - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Stroke line
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(prices[0]));
    for (let i = 1; i < this.data.length; i++) {
      ctx.lineTo(getX(i), getY(prices[i]));
    }
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Hover Indicator
    if (this.hoverIndex >= 0 && this.hoverIndex < this.data.length) {
      const hx = getX(this.hoverIndex);
      const hy = getY(prices[this.hoverIndex]);
      const item = this.data[this.hoverIndex];

      // Vertical guideline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(hx, padding.top);
      ctx.lineTo(hx, h - padding.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Highlight point
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(hx, hy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tooltip Card
      const dateText = item.date || '';
      const priceText = item.price >= 1e8 ? (item.price / 1e8).toFixed(2) + ' 亿' : item.price.toLocaleString();
      ctx.fillStyle = '#1e2433';
      ctx.strokeStyle = '#3b4356';
      ctx.lineWidth = 1;
      const boxW = 110;
      const boxH = 46;
      let boxX = hx - boxW / 2;
      if (boxX < padding.left) boxX = padding.left;
      if (boxX + boxW > w - padding.right) boxX = w - padding.right - boxW;
      const boxY = Math.max(10, hy - boxH - 10);

      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(dateText, boxX + boxW / 2, boxY + 16);

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(priceText, boxX + boxW / 2, boxY + 34);
    }
  }
}

class RadarChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (this.canvas) this.ctx = this.canvas.getContext('2d');
  }

  render(radarData) {
    if (!this.canvas || !radarData || !radarData.length) return;
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width = 360 * dpr;
    const h = this.canvas.height = 300 * dpr;
    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.min(w, h) * 0.38;
    const total = radarData.length;

    // Draw 4 concentric web polygons
    for (let level = 1; level <= 4; level++) {
      const r = (radius / 4) * level;
      ctx.beginPath();
      for (let i = 0; i < total; i++) {
        const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
        const x = centerX + r * Math.cos(angle);
        const y = centerY + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = level === 4 ? '#333b4e' : '#212735';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Spokes from center
    for (let i = 0; i < total; i++) {
      const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#242b3b';
      ctx.stroke();

      // Label
      const labelX = centerX + (radius + 20 * dpr) * Math.cos(angle);
      const labelY = centerY + (radius + 20 * dpr) * Math.sin(angle);
      ctx.fillStyle = '#9ca3af';
      ctx.font = `${11 * dpr}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const item = radarData[i];
      ctx.fillText(item.showName || '', labelX, labelY);
    }

    // Draw Data Polygon
    ctx.beginPath();
    for (let i = 0; i < total; i++) {
      const item = radarData[i];
      const max = item.max || 165;
      const score = item.score || item.value || 0;
      const ratio = Math.min(1, Math.max(0.1, score / max));
      const r = radius * ratio;
      const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();

    // Data points
    for (let i = 0; i < total; i++) {
      const item = radarData[i];
      const max = item.max || 165;
      const score = item.score || item.value || 0;
      const ratio = Math.min(1, Math.max(0.1, score / max));
      const r = radius * ratio;
      const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 3 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();
    }
  }
}

class HotzoneRenderer {
  static getDistrictColor(district, hotZoneList) {
    if (!hotZoneList || !hotZoneList.length) return '#c2a661';
    const match = hotZoneList.find(h => h.district === district);
    if (!match) return '#c2a661';
    const heat = String(match.heat);
    if (heat === '2') return '#e54d42'; // Hot (Red)
    if (heat === '1') return '#c2a661'; // Neutral (Yellow/Gold)
    if (heat === '0') return '#4a90e2'; // Cold (Blue)
    return '#c2a661';
  }

  static renderCourtSvg(hotZoneList) {
    const c = (dist) => this.getDistrictColor(dist, hotZoneList);

    return `
      <svg viewBox="0 0 400 340" width="340" height="290" style="border-radius:8px; background:#0b0d14; border:1px solid #232938;">
        <!-- Baseline & Court boundary -->
        <rect x="20" y="20" width="360" height="300" fill="none" stroke="#374151" stroke-width="2"/>
        
        <!-- Three point corner zones -->
        <path d="M 20 20 L 60 20 L 60 140 L 20 140 Z" fill="${c('three_left')}" opacity="0.85" stroke="#1f2937"/>
        <path d="M 340 20 L 380 20 L 380 140 L 340 140 Z" fill="${c('three_right')}" opacity="0.85" stroke="#1f2937"/>

        <!-- Three point arc zones -->
        <path d="M 60 140 A 150 150 0 0 0 140 245 L 155 190 A 90 90 0 0 1 100 130 L 60 140 Z" fill="${c('three_left_center')}" opacity="0.85" stroke="#1f2937"/>
        <path d="M 140 245 A 150 150 0 0 0 260 245 L 245 190 A 90 90 0 0 1 155 190 Z" fill="${c('three_center')}" opacity="0.85" stroke="#1f2937"/>
        <path d="M 260 245 A 150 150 0 0 0 340 140 L 300 130 A 90 90 0 0 1 245 190 Z" fill="${c('three_right_center')}" opacity="0.85" stroke="#1f2937"/>

        <!-- Mid range zones -->
        <path d="M 60 20 L 140 20 L 140 90 L 100 130 L 60 140 Z" fill="${c('med_left')}" opacity="0.85" stroke="#1f2937"/>
        <path d="M 140 90 L 160 90 L 160 170 L 155 190 L 100 130 Z" fill="${c('med_left_center')}" opacity="0.85" stroke="#1f2937"/>
        <path d="M 160 90 L 240 90 L 245 190 L 155 190 Z" fill="${c('med_center')}" opacity="0.85" stroke="#1f2937"/>
        <path d="M 240 90 L 260 90 L 300 130 L 245 190 Z" fill="${c('med_right_center')}" opacity="0.85" stroke="#1f2937"/>
        <path d="M 260 20 L 340 20 L 340 140 L 300 130 L 260 90 Z" fill="${c('med_right')}" opacity="0.85" stroke="#1f2937"/>

        <!-- Close range paint zones -->
        <path d="M 140 20 L 175 20 L 175 90 L 140 90 Z" fill="${c('close_left')}" opacity="0.85" stroke="#1f2937"/>
        <path d="M 175 55 L 225 55 L 225 90 L 175 90 Z" fill="${c('close_center')}" opacity="0.85" stroke="#1f2937"/>
        <path d="M 225 20 L 260 20 L 260 90 L 225 90 Z" fill="${c('close_right')}" opacity="0.85" stroke="#1f2937"/>

        <!-- Under basket zone -->
        <path d="M 175 20 L 225 20 L 225 55 L 175 55 Z" fill="${c('under_basket')}" opacity="0.9" stroke="#1f2937"/>

        <!-- Basket Rim & Backboard Lines -->
        <line x1="185" y1="26" x2="215" y2="26" stroke="#fff" stroke-width="3"/>
        <circle cx="200" cy="34" r="7" fill="none" stroke="#ea580c" stroke-width="2"/>
        <path d="M 185 34 A 15 15 0 0 0 215 34" fill="none" stroke="#fff" stroke-width="1.5"/>
      </svg>
    `;
  }
}
