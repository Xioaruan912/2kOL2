import { Link } from "react-router-dom";
import { Basketball } from "@phosphor-icons/react";

export function NotFoundPage() {
  return (
    <div className="container page">
      <div className="state-block" style={{ marginTop: 64 }}>
        <span className="state-block__icon">
          <Basketball size={22} />
        </span>
        <div className="state-block__title">页面不存在</div>
        <p className="state-block__text">链接可能已经失效，或者球员 ID 不在当前数据库中。</p>
        <div className="state-block__actions">
          <Link className="btn btn--primary" to="/">
            返回球员库
          </Link>
        </div>
      </div>
    </div>
  );
}
