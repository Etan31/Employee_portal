import { useState } from "react";
import { useAsyncData } from "../../hooks/useAsyncData.js";
import { Icon } from "../../components/Icon/Icon.jsx";
import "./HRPolicies.css";

// Absolute date with year because policy revisions span multiple years
function formatUpdated(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function HRPolicies() {
  const { data, loading, error } = useAsyncData(
    () => import("../../data/policies.js"),
  );
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");

  if (loading) {
    return (
      <div className="hrp-page">
        <div className="nx-page-loading">
          <div className="nx-page-loading__spinner" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="hrp-page">
        <h1 className="nx-h1">HR Policies</h1>
        <p className="hrp-load-error">
          Could not load the policy library. Please refresh the page.
        </p>
      </div>
    );
  }

  const { POLICY_CATEGORIES, POLICIES } = data;
  const categoryLabels = Object.fromEntries(
    POLICY_CATEGORIES.map((c) => [c.id, c.label]),
  );

  const q = query.trim().toLowerCase();
  const filtered = POLICIES.filter((p) => {
    const matchesQuery =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q);
    const matchesCategory = categoryId === "all" || p.categoryId === categoryId;
    return matchesQuery && matchesCategory;
  });

  const clearFilters = () => {
    setQuery("");
    setCategoryId("all");
  };

  return (
    <div className="hrp-page">
      <header className="hrp-header">
        <h1 className="nx-h1">HR Policies</h1>
        <p className="hrp-sub">
          Company policies, guidelines, and statutory references in one place.
        </p>
      </header>

      <div className="hrp-toolbar">
        <div className="hrp-search">
          <Icon name="search" size={15} className="hrp-search__icon" />
          <input
            type="text"
            className="hrp-search__input"
            placeholder="Search policies"
            aria-label="Search policies by title or summary"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="hrp-search__clear"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <Icon name="x" size={13} />
            </button>
          )}
        </div>

        <div className="hrp-chips" role="group" aria-label="Filter by category">
          <button
            className={`hrp-chip${categoryId === "all" ? " hrp-chip--active" : ""}`}
            aria-pressed={categoryId === "all"}
            onClick={() => setCategoryId("all")}
          >
            All
          </button>
          {POLICY_CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={`hrp-chip${categoryId === c.id ? " hrp-chip--active" : ""}`}
              aria-pressed={categoryId === c.id}
              onClick={() => setCategoryId(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <p className="hrp-count" aria-live="polite">
        Showing {filtered.length} of {POLICIES.length} policies
      </p>

      {filtered.length === 0 ? (
        <div className="nx-card hrp-empty">
          <Icon name="search" size={32} className="hrp-empty__icon" />
          <p className="hrp-empty__title">No policies match your search</p>
          <p className="hrp-empty__sub">Try a different keyword or category.</p>
          <button className="hrp-empty__reset" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="hrp-list">
          {filtered.map((p, i) => (
            <li
              key={p.id}
              className="nx-card hrp-row"
              style={{ animationDelay: `${Math.min(i * 35, 140)}ms` }}
            >
              <div className="hrp-row__icon" aria-hidden="true">
                <Icon name="file-text" size={17} />
              </div>
              <div className="hrp-row__body">
                <div className="hrp-row__head">
                  <h3 className="hrp-row__title">{p.title}</h3>
                  <span className="hrp-cat-tag">
                    {categoryLabels[p.categoryId]}
                  </span>
                  {p.acknowledgementRequired && (
                    <span className="nx-status-pill nx-status-pill--warning">
                      Acknowledgement required
                    </span>
                  )}
                </div>
                <p className="hrp-row__summary">{p.summary}</p>
                <p className="hrp-row__meta">
                  <span className="hrp-row__version">{p.version}</span>
                  <span className="hrp-row__dot" aria-hidden="true">
                    &middot;
                  </span>
                  <span>{p.owner}</span>
                  <span className="hrp-row__dot" aria-hidden="true">
                    &middot;
                  </span>
                  <span>Updated {formatUpdated(p.updatedAt)}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
