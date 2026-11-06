import pinyinData from "../data/generated/pinyin.json";
import type { PlayerSummary } from "../data/types";

interface PinyinEntry {
  f: string;
  i: string;
}

const PINYIN_INDEX = pinyinData as Record<string, PinyinEntry>;

/** 常见绰号与英文简称，按完整球员名精确匹配，避免同名误伤 */
const ALIAS_GROUPS: Array<{ key: string; alias: string[] }> = [
  { key: "斯蒂芬.库里", alias: ["萌神", "小学生", "curry", "kuli"] },
  { key: "勒布朗.詹姆斯", alias: ["老詹", "小皇帝", "詹皇", "lebron", "lbj"] },
  { key: "詹姆斯.哈登", alias: ["大胡子", "harden", "胡子"] },
  { key: "凯文.杜兰特", alias: ["死神", "kd", "durant"] },
  { key: "科比.布莱恩特", alias: ["黑曼巴", "飞侠", "kobe", "kb"] },
  { key: "迈克尔.乔丹", alias: ["飞人", "mj", "jordan"] },
  { key: "蒂姆.邓肯", alias: ["石佛", "duncan", "td"] },
  { key: "沙奎尔.奥尼尔", alias: ["大鲨鱼", "shaq", "oneal"] },
  { key: "阿伦.艾弗森", alias: ["答案", "iverson", "ai"] },
  { key: "德怀恩.韦德", alias: ["闪电侠", "wade"] },
  { key: "文斯.卡特", alias: ["半人半神", "carter", "vinsanity"] },
  { key: "哈基姆.奥拉朱旺", alias: ["大梦", "olajuwon", "hakeem"] },
  { key: "卡里姆.阿卜杜勒-贾巴尔", alias: ["天勾", "kareem", "skyhook"] },
  { key: "埃尔文.约翰逊", alias: ["魔术师", "magic"] },
  { key: "拉里.伯德", alias: ["大鸟", "bird", "larry"] },
  { key: "卡尔.马龙", alias: ["邮差", "malone"] },
  { key: "加里.佩顿", alias: ["手套", "payton", "gp"] },
  { key: "德克.诺维斯基", alias: ["德国战车", "dirk", "司机"] },
  { key: "凯文.加内特", alias: ["狼王", "kg", "garnett"] },
  { key: "特雷西.麦格雷迪", alias: ["麦迪", "tmac", "t-mac"] },
  { key: "科怀.伦纳德", alias: ["卡哇伊", "kawhi", "小卡"] },
  { key: "卢卡.东契奇", alias: ["077", "luka", "卢卡"] },
  { key: "尼古拉.约季奇", alias: ["约基奇", "jokic", "小丑"] },
  { key: "维克托.文班亚马", alias: ["wemby", "文班", "斑马"] },
  { key: "扬尼斯.阿德托昆博", alias: ["字母哥", "giannis", "greek freak"] },
  { key: "德里克.罗斯", alias: ["玫瑰", "rose", "drose"] },
  { key: "凯里.欧文", alias: ["德鲁大叔", "irving", "欧神仙"] },
  { key: "克莱.汤普森", alias: ["汤神", "kt", "klay"] },
  { key: "卡梅隆.安东尼", alias: ["甜瓜", "melo", "melon"] },
  { key: "克里斯.保罗", alias: ["cp3", "控卫之神"] },
  { key: "拉塞尔.威斯布鲁克", alias: ["威少", "westbrook", "rw"] },
  { key: "S.G.亚历山大", alias: ["sga", "shai", "亚历山大"] },
];

export function matchesSearch(player: PlayerSummary, rawKeyword: string): boolean {
  const keyword = rawKeyword.trim().toLowerCase();
  if (!keyword) return true;

  const haystack = `${player.name} ${player.nameEn} ${player.team} ${player.archetype}`.toLowerCase();
  if (haystack.includes(keyword)) return true;

  const entry = PINYIN_INDEX[player.name];
  if (entry && (entry.f.includes(keyword) || entry.i.startsWith(keyword))) return true;

  return ALIAS_GROUPS.some(
    (group) =>
      player.name === group.key &&
      group.alias.some((alias) => {
        const value = alias.toLowerCase();
        return value === keyword || value.startsWith(keyword) || keyword.startsWith(value);
      }),
  );
}
