import { useMemo, useState } from "react";
import { useAsyncData } from "../../hooks/useAsyncData.js";
import { flattenOrgTree } from "../../utils/orgData.js";
import { Icon } from "../../components/Icon/Icon.jsx";
import "./Employees.css";

// Avatar initials, e.g. "Nicole Anderson" -> "NA".
function initialsOf(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Employees() {
  const { data, loading, error } = useAsyncData(() => import("../../data/orgSample.js"));
  const [query, setQuery] = useState("");
  const [unit, setUnit] = useState("All");

  // orgSample is a default export; prefer the large tree, fall back to standard.
  const people = useMemo(() => {
    if (!data) return [];
    const sample = data.default;
    const tree = sample.large?.org || sample.standard.org;
    return flattenOrgTree(tree);
  }, [data]);

  const units = useMemo(() => [...new Set(people.map((p) => p.unit))], [people]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter(
      (p) =>
        (unit === "All" || p.unit === unit) &&
        (!q ||
          p.name.toLowerCase().includes(q) ||
          p.position.toLowerCase().includes(q)),
    );
  }, [people, query, unit]);

  if (loading) {
    return (
      <div className="nx-page-loading">
        <div className="nx-page-loading__spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="emp-page">
        <h1 className="nx-h1">Employees</h1>
        <p className="emp-load-error">The directory could not be loaded. Refresh to try again.</p>
      </div>
    );
  }

  return (
    <div className="emp-page">
      <header className="emp-header">
        <h1 className="nx-h1">Employees</h1>
        <p className="emp-subtitle">
          {people.length} people across {units.length} units
        </p>
      </header>

      <div className="emp-toolbar">
        <div className="emp-search">
          <Icon name="search" size={16} className="emp-search__icon" />
          <input
            type="search"
            className="emp-search__input"
            placeholder="Search by name or position"
            aria-label="Search employees by name or position"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="emp-units" role="group" aria-label="Filter by unit">
          {["All", ...units].map((u) => (
            <button
              key={u}
              type="button"
              className={`emp-unit-chip ${unit === u ? "emp-unit-chip--active" : ""}`}
              aria-pressed={unit === u}
              onClick={() => setUnit(u)}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <p className="emp-count" role="status">
        Showing {filtered.length} of {people.length} people
      </p>

      {filtered.length === 0 ? (
        <div className="emp-empty">
          <Icon name="users" size={36} className="emp-empty__icon" />
          <p className="emp-empty__text">No one matches your search.</p>
          <button
            type="button"
            className="emp-empty__reset"
            onClick={() => {
              setQuery("");
              setUnit("All");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="emp-grid">
          {filtered.map((person, i) => (
            <li
              key={person.key}
              className="emp-card"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <div className="emp-card__avatar" aria-hidden="true">
                {initialsOf(person.name)}
              </div>
              <div className="emp-card__body">
                <div className="emp-card__name-row">
                  <h3 className="emp-card__name">{person.name}</h3>
                  {person.hasReports && (
                    <span className="nx-status-pill nx-status-pill--info">Lead</span>
                  )}
                </div>
                <p className="emp-card__position">{person.position}</p>
                <p className="emp-card__unit">{person.unit}</p>
                {person.email && (
                  <a className="emp-card__email" href={`mailto:${person.email}`}>
                    {person.email}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
