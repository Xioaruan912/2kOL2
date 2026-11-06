import type { PlayerDetail } from "../../data/types";
import { ATTRIBUTE_GROUPS, attributeGroupOf } from "../../data/taxonomy";

export function AttributesTab({ detail }: { detail: PlayerDetail }) {
  const unknown = detail.attributes.filter(
    (attr) => attributeGroupOf(attr.name) === "other",
  );
  const groups = [
    ...ATTRIBUTE_GROUPS.map((group) => ({
      ...group,
      attrs: group.names
        .map((name) => detail.attributes.find((attr) => attr.name === name))
        .filter((attr): attr is NonNullable<typeof attr> => Boolean(attr)),
    })).filter((group) => group.attrs.length > 0),
    ...(unknown.length
      ? [{ key: "other", label: "其他属性", hint: "未归类的属性项", attrs: unknown }]
      : []),
  ];

  return (
    <div className="attr-groups">
      {groups.map((group) => {
        const avg = Math.round(
          group.attrs.reduce((sum, attr) => sum + attr.value, 0) / group.attrs.length,
        );
        return (
          <section className="attr-group" key={group.key} aria-label={group.label}>
            <div className="attr-group__head">
              <h2 className="attr-group__title">
                {group.label}
                <span className="attr-group__hint">{group.hint}</span>
              </h2>
              <span className="attr-group__avg">
                平均<b>{avg}</b>
              </span>
            </div>
            <div className="attr-grid">
              {group.attrs.map((attr) => {
                const delta = attr.value - attr.base;
                return (
                  <div className="attr-row" key={attr.name}>
                    <span className="attr-row__name">
                      {attr.name}
                      {delta > 0 ? <span className="attr-row__delta">+{delta}</span> : null}
                    </span>
                    <span className="bar attr-row__bar">
                      <span
                        className="bar__fill"
                        style={{ width: `${Math.min(100, (attr.value / 160) * 100)}%` }}
                      />
                    </span>
                    <span className={`attr-row__value${attr.value >= 130 ? " is-elite" : ""}`}>
                      {attr.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
