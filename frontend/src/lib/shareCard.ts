import QRCode from "qrcode";
import type { PlayerDetail } from "../data/types";
import { formatPrice } from "./format";
import { imageUrl } from "./image";

const W = 1080;
const H = 1400;
const PAD = 64;
const INK = "#141519";
const TEXT = "#f4f2ee";
const SUB = "#a9adb6";
const ACCENT = "#e1532b";
const FONT = '"PingFang SC","Microsoft YaHei","Hiragino Sans GB",system-ui,sans-serif';
const CARD_STATS = ["运动", "突破", "篮下", "中投", "三分", "篮板"];
const LEVEL_COLORS: Record<string, string> = {
  bronze: "#9a6b45",
  silver: "#7c848f",
  gold: "#b08a2b",
  purple: "#7852ae",
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image load failed"));
    image.src = src;
  });
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  weight: number,
  size: number,
  minSize = 16,
): number {
  let current = size;
  ctx.font = `${weight} ${current}px ${FONT}`;
  while (ctx.measureText(text).width > maxWidth && current > minSize) {
    current -= 1;
    ctx.font = `${weight} ${current}px ${FONT}`;
  }
  return current;
}

export function shareUrlFor(detail: PlayerDetail): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/player/${detail.id}`;
}

export async function renderShareCard(detail: PlayerDetail): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前浏览器不支持 Canvas");

  // 背景
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.86, 0, 0, W * 0.86, 0, 980);
  glow.addColorStop(0, "rgba(225,83,43,0.24)");
  glow.addColorStop(1, "rgba(225,83,43,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.045;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  for (let x = -H; x < W; x += 72) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + H, H);
    ctx.stroke();
  }
  ctx.restore();

  // 顶部标识
  ctx.fillStyle = ACCENT;
  roundRect(ctx, PAD, 60, 46, 46, 9);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(PAD + 23, 83, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(PAD + 11, 83);
  ctx.lineTo(PAD + 35, 83);
  ctx.moveTo(PAD + 23, 71);
  ctx.lineTo(PAD + 23, 95);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = TEXT;
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText("COURTSIDE DB", PAD + 62, 82);
  ctx.fillStyle = SUB;
  ctx.font = `400 15px ${FONT}`;
  ctx.fillText("2KOL2 球员数据库", PAD + 62, 106);

  ctx.textAlign = "right";
  ctx.fillStyle = SUB;
  ctx.font = `500 15px ${FONT}`;
  ctx.fillText("PLAYER CARD", W - PAD, 82);
  ctx.textAlign = "left";

  // 头像
  const px = PAD;
  const py = 156;
  const pw = 340;
  const ph = 424;
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 14);
  ctx.clip();
  ctx.fillStyle = "#20222a";
  ctx.fillRect(px, py, pw, ph);
  try {
    const portrait = await loadImage(imageUrl(detail.portrait));
    const scale = Math.max(pw / portrait.width, ph / portrait.height);
    const drawW = portrait.width * scale;
    const drawH = portrait.height * scale;
    ctx.drawImage(portrait, px + (pw - drawW) / 2, py, drawW, drawH);
  } catch {
    ctx.fillStyle = SUB;
    ctx.font = `700 120px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(detail.name.slice(0, 1) || "·", px + pw / 2, py + 250);
    ctx.textAlign = "left";
  }
  ctx.restore();
  ctx.fillStyle = ACCENT;
  ctx.fillRect(px, py + ph - 6, pw, 6);

  // 右侧信息
  const rx = 444;
  const rw = W - PAD - rx;
  const nameSize = fitText(ctx, detail.name, rw, 700, 56, 34);
  ctx.fillStyle = TEXT;
  ctx.font = `700 ${nameSize}px ${FONT}`;
  ctx.fillText(detail.name, rx, 226);

  ctx.fillStyle = SUB;
  ctx.font = `400 19px ${FONT}`;
  ctx.fillText(detail.nameEn, rx, 262);

  // 标签
  const tags = [detail.positions.join("/"), detail.team, detail.series].filter(Boolean);
  let tagX = rx;
  let tagY = 296;
  tags.forEach((tag) => {
    ctx.font = `500 16px ${FONT}`;
    const textWidth = ctx.measureText(tag).width;
    const pillWidth = textWidth + 26;
    if (tagX + pillWidth > W - PAD) {
      tagX = rx;
      tagY += 44;
    }
    roundRect(ctx, tagX, tagY, pillWidth, 32, 16);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = TEXT;
    ctx.fillText(tag, tagX + 13, tagY + 22);
    tagX += pillWidth + 10;
  });

  // 总评
  ctx.fillStyle = SUB;
  ctx.font = `500 16px ${FONT}`;
  ctx.fillText("综合评分", rx, 400);
  ctx.fillStyle = ACCENT;
  ctx.font = `700 150px ${FONT}`;
  ctx.fillText(String(detail.overall), rx - 4, 540);

  // 身价
  ctx.fillStyle = SUB;
  ctx.font = `500 16px ${FONT}`;
  ctx.fillText("当前身价", rx, 590);
  ctx.fillStyle = TEXT;
  ctx.font = `600 28px ${FONT}`;
  ctx.fillText(formatPrice(detail.price), rx, 626);

  // 徽章
  ctx.fillStyle = SUB;
  ctx.font = `500 16px ${FONT}`;
  ctx.fillText("徽章", PAD, 700);
  const levels: Array<keyof PlayerDetail["badgeCounts"]> = ["bronze", "silver", "gold", "purple"];
  levels.forEach((level, index) => {
    const cx = PAD + 26 + index * 168;
    ctx.fillStyle = LEVEL_COLORS[level];
    hexPath(ctx, cx, 740, 21);
    ctx.fill();
    ctx.fillStyle = TEXT;
    ctx.font = `600 24px ${FONT}`;
    ctx.fillText(String(detail.badgeCounts[level]), cx + 32, 748);
  });

  // 能力
  ctx.fillStyle = SUB;
  ctx.font = `500 16px ${FONT}`;
  ctx.fillText("能力", PAD, 812);

  CARD_STATS.forEach((name, index) => {
    const entry = detail.radar.find((item) => item.name === name);
    if (!entry) return;
    const rowY = 862 + index * 52;
    ctx.fillStyle = TEXT;
    ctx.font = `500 20px ${FONT}`;
    ctx.fillText(name, PAD, rowY + 6);

    const trackX = 200;
    const trackW = 620;
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    roundRect(ctx, trackX, rowY - 3, trackW, 10, 5);
    ctx.fill();
    const ratio = Math.min(1, Math.max(0.04, entry.score / (entry.max || 130)));
    ctx.fillStyle = ACCENT;
    roundRect(ctx, trackX, rowY - 3, trackW * ratio, 10, 5);
    ctx.fill();

    ctx.fillStyle = TEXT;
    ctx.font = `600 20px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(String(entry.score), W - PAD, rowY + 7);
    ctx.textAlign = "left";
  });

  // 分割线
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, 1170);
  ctx.lineTo(W - PAD, 1170);
  ctx.stroke();

  // 二维码与链接
  const url = shareUrlFor(detail);
  const qrDataUrl = await QRCode.toDataURL(url, {
    margin: 1,
    width: 320,
    color: { dark: INK, light: "#ffffff" },
  });
  const qr = await loadImage(qrDataUrl);
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, PAD, 1196, 176, 176, 10);
  ctx.fill();
  ctx.drawImage(qr, PAD + 8, 1204, 160, 160);

  const textX = PAD + 212;
  ctx.fillStyle = SUB;
  ctx.font = `500 17px ${FONT}`;
  ctx.fillText("扫码查看完整数据", textX, 1234);

  const urlSize = fitText(ctx, url, W - PAD - textX, 600, 21, 12);
  ctx.fillStyle = TEXT;
  ctx.font = `600 ${urlSize}px ${FONT}`;
  ctx.fillText(url, textX, 1272);

  ctx.fillStyle = SUB;
  ctx.font = `400 15px ${FONT}`;
  ctx.fillText("属性 · 徽章 · 动作 · 倾向 · 身价走势", textX, 1304);

  ctx.textAlign = "right";
  ctx.fillStyle = ACCENT;
  ctx.font = `700 16px ${FONT}`;
  ctx.fillText("COURTSIDE DB", W - PAD, 1340);
  ctx.textAlign = "left";

  return canvas;
}
