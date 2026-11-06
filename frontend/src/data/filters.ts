import { BADGE_NAME_MAP } from "./taxonomy";

export interface OptionGroup {
  label: string;
  items: string[];
}

export const ATTRIBUTE_FILTER_GROUPS: OptionGroup[] = [
  {
    label: "终结与内线",
    items: [
      "突破上篮",
      "原地近距离投篮",
      "原地灌篮",
      "突破灌篮",
      "背身后仰跳投",
      "背身钩射",
      "背身控制",
      "造成对手犯规",
    ],
  },
  { label: "投篮", items: ["中距离投篮", "三分投篮", "罚球"] },
  { label: "组织进攻", items: ["控球", "传球智商", "传球准确性", "传球视野"] },
  {
    label: "防守",
    items: [
      "内线防守",
      "外线防守",
      "横向移动速度",
      "盖帽",
      "运球抢断",
      "传球抢断",
      "防守稳定性",
      "协防智商",
    ],
  },
  { label: "篮板", items: ["进攻篮板", "防守篮板", "争抢"] },
  { label: "身体素质", items: ["速度", "加速", "运球速度", "弹跳力", "力量", "体力"] },
  { label: "精神属性", items: ["投篮智商", "进攻稳定性", "接球"] },
];

export const BADGE_FILTER_LEVELS = [
  { value: "紫", label: "紫徽章" },
  { value: "金", label: "金徽章" },
  { value: "银", label: "银徽章" },
  { value: "铜", label: "铜徽章" },
] as const;

export const BADGE_FILTER_GROUPS: OptionGroup[] = [
  { label: "终结", items: BADGE_NAME_MAP.finish },
  { label: "投篮", items: BADGE_NAME_MAP.shoot },
  { label: "组织", items: BADGE_NAME_MAP.playmaking },
  { label: "防守", items: BADGE_NAME_MAP.defense },
  { label: "篮板", items: BADGE_NAME_MAP.rebound },
];

export const PLAY_TYPE_OPTIONS = [
  { id: 1, label: "单打" },
  { id: 2, label: "侧翼单打" },
  { id: 3, label: "顶弧单打" },
  { id: 4, label: "挡拆持球" },
  { id: 5, label: "挡拆得分" },
  { id: 6, label: "侧翼挡拆" },
  { id: 7, label: "挡拆切入" },
  { id: 8, label: "低位背身" },
  { id: 9, label: "高位背身" },
  { id: 10, label: "背身外线" },
  { id: 11, label: "手递手接球" },
  { id: 12, label: "手递手传球" },
  { id: 13, label: "空切" },
  { id: 14, label: "中距离" },
  { id: 15, label: "三分" },
  { id: 16, label: "定点投篮" },
];

export function playTypeLabel(id: number): string {
  return PLAY_TYPE_OPTIONS.find((item) => item.id === id)?.label ?? `战术 ${id}`;
}
