import { useEffect, useMemo, useState } from "react";
import { Check, Plus, X } from "@phosphor-icons/react";
import type { AttributeCondition, BadgeCondition, BadgeLevelCn } from "../data/types";
import type { FilterState } from "../lib/filtering";
import { SearchField } from "./SearchField";
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

const LEVEL_COLOR: Record<BadgeLevelCn, string> = {
  紫: "#7852ae",
  金: "#b08a2b",
  银: "#7c848f",
  铜: "#9a6b45",
};

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
  const [badgeLevel, setBadgeLevel] = useState<BadgeLevelCn>("紫");
  const [badgeQuery, setBadgeQuery] = useState("");
  const [badgeCategory, setBadgeCategory] = useState("all");
  const [attrName, setAttrName] = useState("三分投篮");
  const [attrMin, setAttrMin] = useState<number | undefined>(120);

  useEffect(() => {
    if (open) {
      setValues(drawerValuesFromFilters(filters));
      setBadgeQuery("");
      setBadgeCategory("all");
    }
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

  const badgeOptions = useMemo(() => {
    const keyword = badgeQuery.trim();
    const groups =
      badgeCategory === "all"
        ? BADGE_FILTER_GROUPS
        : BADGE_FILTER_GROUPS.filter((group) => group.label === badgeCategory);
    return groups.flatMap((group) =>
      group.items.filter((name) => !keyword || name.includes(keyword)),
    );
  }, [badgeCategory, badgeQuery]);

  if (!open) return null;

  const patch = (next: Partial<DrawerValues>) =>
    setValues((current) => ({ ...current, ...next }));

  const setRange = (
    key: "overallMin" | "overallMax" | "priceMin" | "priceMax" | "heightMin" | "heightMax",
    value?: number,
  ) => setValues((current) => ({ ...current, [key]: value }));

  const toggleBadge = (name: string) => {
    const exists = values.badges.some(
      (item) => item.name === name && item.level === badgeLevel,
    );
    patch({
      badges: exists
        ? values.badges.filter((item) => !(item.name === name && item.level === badgeLevel))
        : [...values.badges, { name, level: badgeLevel }],
    });
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
    <div
      className="drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="精细筛选"
      onClick={onClose}
    >
      <div className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer__handle" aria-hidden="true" />

        <div className="drawer__head">
          <div>
            <div className="drawer__title">精细筛选</div>
            <div className="drawer__sub">区间即时生效，徽章与属性走官方实时数据</div>
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
                  className={
                    values.overallMin === value && values.overallMax === undefined
                      ? "chip is-active"
                      : "chip"
                  }
                  onClick={() => patch({ overallMin: value, overallMax: undefined })}
                >
                  {value}+
                </button>
              ))}
            </div>
          </section>

          <section className="drawer__section">
            <div className="drawer__label">
              价格（万）
              <span className="drawer__hint">无市价球员不会命中价格条件</span>
            </div>
            <div className="range-grid">
              <NumberField
                value={values.priceMin}
                onChange={(value) => setRange("priceMin", value)}
                unit="万"
                placeholder="最低"
                ariaLabel="价格最低值（万）"
              />
              <NumberField
                value={values.priceMax}
                onChange={(value) => setRange("priceMax", value)}
                unit="万"
                placeholder="最高"
                ariaLabel="价格最高值（万）"
              />
            </div>
            <div className="preset-row">
              {[100000, 50000, 20000, 10000].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={
                    values.priceMin === value && values.priceMax === undefined
                      ? "chip is-active"
                      : "chip"
                  }
                  onClick={() => patch({ priceMin: value, priceMax: undefined })}
                >
                  {value.toLocaleString("zh-CN")} 万+
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
                  className={
                    values.heightMin === value && values.heightMax === undefined
                      ? "chip is-active"
                      : "chip"
                  }
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
              <span className="drawer__hint">选好等级后点击徽章添加</span>
            </div>

            <div className="level-switch" role="group" aria-label="徽章等级">
              {BADGE_FILTER_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  className={
                    badgeLevel === level.value
                      ? "level-switch__item is-active"
                      : "level-switch__item"
                  }
                  aria-pressed={badgeLevel === level.value}
                  onClick={() => setBadgeLevel(level.value)}
                >
                  <span
                    className="level-switch__dot"
                    style={{ background: LEVEL_COLOR[level.value] }}
                  />
                  {level.value}
                </button>
              ))}
            </div>

            <SearchField
              value={badgeQuery}
              onChange={setBadgeQuery}
              placeholder="搜索徽章名称"
              ariaLabel="搜索徽章名称"
            />

            <div className="chip-row" role="group" aria-label="徽章分类">
              <button
                type="button"
                className={badgeCategory === "all" ? "chip is-active" : "chip"}
                onClick={() => setBadgeCategory("all")}
              >
                全部
              </button>
              {BADGE_FILTER_GROUPS.map((group) => (
                <button
                  key={group.label}
                  type="button"
                  className={badgeCategory === group.label ? "chip is-active" : "chip"}
                  onClick={() => setBadgeCategory(group.label)}
                >
                  {group.label}
                </button>
              ))}
            </div>

            <div className="badge-pick-grid">
              {badgeOptions.map((name) => {
                const selected = values.badges.some(
                  (item) => item.name === name && item.level === badgeLevel,
                );
                return (
                  <button
                    key={name}
                    type="button"
                    className={selected ? "badge-pick is-selected" : "badge-pick"}
                    aria-pressed={selected}
                    onClick={() => toggleBadge(name)}
                  >
                    <span
                      className="badge-pick__hex"
                      style={{ background: LEVEL_COLOR[badgeLevel] }}
                      aria-hidden="true"
                    >
                      {badgeLevel}
                    </span>
                    <span className="badge-pick__name">{name}</span>
                    {selected ? (
                      <Check size={12} weight="bold" className="badge-pick__mark" />
                    ) : (
                      <Plus size={12} weight="bold" className="badge-pick__mark" />
                    )}
                  </button>
                );
              })}
              {badgeOptions.length === 0 ? (
                <div className="badge-pick-empty">没有匹配的徽章，换个关键词试试</div>
              ) : null}
            </div>

            {values.badges.length ? (
              <div className="drawer__chips">
                {values.badges.map((badge) => (
                  <span className="cond-chip" key={`${badge.name}-${badge.level}`}>
                    <span
                      className="cond-chip__dot"
                      style={{ background: LEVEL_COLOR[badge.level] }}
                    />
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
                          attributes: values.attributes.filter(
                            (item) => item.name !== attribute.name,
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
            应用筛选{conditionCount > 0 ? ` · ${conditionCount}` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
