import { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";
import type { AttributeCondition, BadgeCondition, BadgeLevelCn } from "../data/types";
import type { FilterState } from "../lib/filtering";
import {
  ATTRIBUTE_FILTER_GROUPS,
  BADGE_FILTER_GROUPS,
  BADGE_FILTER_LEVELS,
  PLAY_TYPE_OPTIONS,
} from "../data/filters";

export interface DrawerValues {
  overallMin?: number;
  overallMax?: number;
  priceMin?: number;
  priceMax?: number;
  heightMin?: number;
  heightMax?: number;
  badges: BadgeCondition[];
  attributes: AttributeCondition[];
  playTypes: number[];
}

export function drawerValuesFromFilters(filters: FilterState): DrawerValues {
  return {
    overallMin: filters.overallMin,
    overallMax: filters.overallMax,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    heightMin: filters.heightMin,
    heightMax: filters.heightMax,
    badges: [...filters.advanced.badges],
    attributes: [...filters.advanced.attributes],
    playTypes: [...filters.advanced.playTypes],
  };
}

const EMPTY_VALUES: DrawerValues = {
  badges: [],
  attributes: [],
  playTypes: [],
};

function NumberField({
  value,
  onChange,
  unit,
  placeholder,
  ariaLabel,
}: {
  value?: number;
  onChange: (value?: number) => void;
  unit?: string;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <label className="num-field">
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw === "") {
            onChange(undefined);
            return;
          }
          const num = Number(raw);
          onChange(Number.isFinite(num) ? num : undefined);
        }}
      />
      {unit ? <span>{unit}</span> : null}
    </label>
  );
}

interface FilterDrawerProps {
  open: boolean;
  filters: FilterState;
  onClose: () => void;
  onApply: (values: DrawerValues) => void;
}

export function FilterDrawer({ open, filters, onClose, onApply }: FilterDrawerProps) {
  const [values, setValues] = useState<DrawerValues>(() => drawerValuesFromFilters(filters));
  const [badgeName, setBadgeName] = useState(BADGE_FILTER_GROUPS[0].items[0]);
  const [badgeLevel, setBadgeLevel] = useState<BadgeLevelCn>("紫");
  const [attrName, setAttrName] = useState("三分投篮");
  const [attrMin, setAttrMin] = useState<number | undefined>(120);

  useEffect(() => {
    if (open) setValues(drawerValuesFromFilters(filters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  const patch = (next: Partial<DrawerValues>) =>
    setValues((current) => ({ ...current, ...next }));

  const setRange = (
    key: "overallMin" | "overallMax" | "priceMin" | "priceMax" | "heightMin" | "heightMax",
    value?: number,
  ) => setValues((current) => ({ ...current, [key]: value }));

  const addBadge = () => {
    if (!badgeName) return;
    if (values.badges.some((item) => item.name === badgeName && item.level === badgeLevel)) return;
    patch({ badges: [...values.badges, { name: badgeName, level: badgeLevel }] });
  };

  const addAttribute = () => {
    if (!attrName || attrMin === undefined) return;
    const rest = values.attributes.filter((item) => item.name !== attrName);
    patch({ attributes: [...rest, { name: attrName, min: attrMin }] });
  };

  const togglePlayType = (id: number) => {
    patch({
      playTypes: values.playTypes.includes(id)
        ? values.playTypes.filter((item) => item !== id)
        : [...values.playTypes, id],
    });
  };

  const conditionCount =
    (values.overallMin !== undefined || values.overallMax !== undefined ? 1 : 0) +
    (values.priceMin !== undefined || values.priceMax !== undefined ? 1 : 0) +
    (values.heightMin !== undefined || values.heightMax !== undefined ? 1 : 0) +
    values.badges.length +
    values.attributes.length +
    values.playTypes.length;

  return (
    <div className="drawer-backdrop" role="dialog" aria-modal="true" aria-label="精细筛选" onClick={onClose}>
      <div className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer__head">
          <div>
            <div className="drawer__title">精细筛选</div>
            <div className="drawer__sub">按区间、徽章、属性与战术筛出球员</div>
          </div>
          <button type="button" className="icon-btn" aria-label="关闭筛选面板" onClick={onClose}>
            <X size={15} weight="bold" />
          </button>
        </div>

        <div className="drawer__body">
          <section className="drawer__section">
            <div className="drawer__label">
              总评
              <span className="drawer__hint">区间条件本地即时生效</span>
            </div>
            <div className="range-grid">
              <NumberField
                value={values.overallMin}
                onChange={(value) => setRange("overallMin", value)}
                placeholder="最低"
                ariaLabel="总评最低值"
              />
              <NumberField
                value={values.overallMax}
                onChange={(value) => setRange("overallMax", value)}
                placeholder="最高"
                ariaLabel="总评最高值"
              />
            </div>
            <div className="preset-row">
              {[135, 130, 125, 120].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={values.overallMin === value && values.overallMax === undefined ? "chip is-active" : "chip"}
                  onClick={() => patch({ overallMin: value, overallMax: undefined })}
                >
                  {value}+
                </button>
              ))}
            </div>
          </section>

          <section className="drawer__section">
            <div className="drawer__label">
              价格
              <span className="drawer__hint">无市价球员不会命中价格条件</span>
            </div>
            <div className="range-grid">
              <NumberField
                value={values.priceMin}
                onChange={(value) => setRange("priceMin", value)}
                unit="亿"
                placeholder="最低"
                ariaLabel="价格最低值（亿）"
              />
              <NumberField
                value={values.priceMax}
                onChange={(value) => setRange("priceMax", value)}
                unit="亿"
                placeholder="最高"
                ariaLabel="价格最高值（亿）"
              />
            </div>
            <div className="preset-row">
              {[5, 2, 1].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={values.priceMin === value && values.priceMax === undefined ? "chip is-active" : "chip"}
                  onClick={() => patch({ priceMin: value, priceMax: undefined })}
                >
                  {value} 亿+
                </button>
              ))}
            </div>
          </section>

          <section className="drawer__section">
            <div className="drawer__label">身高</div>
            <div className="range-grid">
              <NumberField
                value={values.heightMin}
                onChange={(value) => setRange("heightMin", value)}
                unit="cm"
                placeholder="最低"
                ariaLabel="身高最低值"
              />
              <NumberField
                value={values.heightMax}
                onChange={(value) => setRange("heightMax", value)}
                unit="cm"
                placeholder="最高"
                ariaLabel="身高最高值"
              />
            </div>
            <div className="preset-row">
              {[215, 210, 200, 190].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={values.heightMin === value && values.heightMax === undefined ? "chip is-active" : "chip"}
                  onClick={() => patch({ heightMin: value, heightMax: undefined })}
                >
                  {value}cm+
                </button>
              ))}
            </div>
          </section>

          <section className="drawer__section">
            <div className="drawer__label">
              徽章条件
              <span className="drawer__hint">通过官方实时接口筛选</span>
            </div>
            <div className="badge-add-row">
              <select
                className="drawer-select"
                aria-label="徽章名称"
                value={badgeName}
                onChange={(event) => setBadgeName(event.target.value)}
              >
                {BADGE_FILTER_GROUPS.map((group) => (
                  <optgroup label={group.label} key={group.label}>
                    {group.items.map((name) => (
                      <option value={name} key={name}>
                        {name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <select
                className="drawer-select"
                aria-label="徽章等级"
                value={badgeLevel}
                onChange={(event) => setBadgeLevel(event.target.value as BadgeLevelCn)}
              >
                {BADGE_FILTER_LEVELS.map((level) => (
                  <option value={level.value} key={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn--sm" onClick={addBadge}>
                添加
              </button>
            </div>
            {values.badges.length ? (
              <div className="drawer__chips">
                {values.badges.map((badge) => (
                  <span className="cond-chip" key={`${badge.name}-${badge.level}`}>
                    {badge.name}
                    <b>{badge.level}</b>
                    <button
                      type="button"
                      aria-label={`移除徽章条件 ${badge.name}`}
                      onClick={() =>
                        patch({
                          badges: values.badges.filter(
                            (item) => !(item.name === badge.name && item.level === badge.level),
                          ),
                        })
                      }
                    >
                      <X size={10} weight="bold" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section className="drawer__section">
            <div className="drawer__label">
              属性条件
              <span className="drawer__hint">数值为特训后能力值</span>
            </div>
            <div className="attr-add-row">
              <select
                className="drawer-select"
                aria-label="属性名称"
                value={attrName}
                onChange={(event) => setAttrName(event.target.value)}
              >
                {ATTRIBUTE_FILTER_GROUPS.map((group) => (
                  <optgroup label={group.label} key={group.label}>
                    {group.items.map((name) => (
                      <option value={name} key={name}>
                        {name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <NumberField
                value={attrMin}
                onChange={setAttrMin}
                placeholder="最低值"
                ariaLabel="属性最低值"
              />
              <button type="button" className="btn btn--sm" onClick={addAttribute}>
                添加
              </button>
            </div>
            {values.attributes.length ? (
              <div className="drawer__chips">
                {values.attributes.map((attribute) => (
                  <span className="cond-chip" key={attribute.name}>
                    {attribute.name}
                    <b>≥ {attribute.min}</b>
                    <button
                      type="button"
                      aria-label={`移除属性条件 ${attribute.name}`}
                      onClick={() =>
                        patch({
                          attributes: values.attributes.filter((item) => item.name !== attribute.name),
                        })
                      }
                    >
                      <X size={10} weight="bold" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section className="drawer__section">
            <div className="drawer__label">
              战术类型
              <span className="drawer__hint">{values.playTypes.length} 项已选</span>
            </div>
            <div className="play-grid">
              {PLAY_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={values.playTypes.includes(option.id) ? "chip is-active" : "chip"}
                  onClick={() => togglePlayType(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="drawer__foot">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setValues(EMPTY_VALUES);
            }}
          >
            重置条件
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onApply(values)}>
            应用筛选{conditionCount > 0 ? ` (${conditionCount})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
