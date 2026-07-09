import { useMemo, useState } from "react";
import OrgChartView from "../../components/OrgChartView/OrgChartView";
import { useAsyncData } from "../../hooks/useAsyncData.js";
import { getOrgStats } from "../../utils/orgData.js";
import "./Organization.css";

function SearchIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={11} cy={11} r={8} />
      <line x1={21} y1={21} x2={16.65} y2={16.65} />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x={6} y={14} width={12} height={8} />
    </svg>
  );
}

const STAT_ICONS = {
  users: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx={9} cy={7} r={4}/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  layout: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={3} y={3} width={18} height={18} rx={2}/>
      <line x1={3} y1={9} x2={21} y2={9}/><line x1={9} y1={21} x2={9} y2={9}/>
    </svg>
  ),
  branch: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1={6} y1={3} x2={6} y2={15}/>
      <circle cx={18} cy={6} r={3}/><circle cx={6} cy={18} r={3}/>
      <path d="M18 9a9 9 0 0 1-9 9"/>
    </svg>
  ),
  check: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx={8.5} cy={7} r={4}/><polyline points="17 11 19 13 23 9"/>
    </svg>
  ),
};

function StatCard({ icon, label, value, color }) {
  return (
    <div className="org-stat-card">
      <div className={`org-stat-icon org-stat-icon--${color}`}>
        {STAT_ICONS[icon]}
      </div>
      <div>
        <div className={`org-stat-value org-stat-value--${color}`}>{value}</div>
        <div className="org-stat-label">{label}</div>
      </div>
    </div>
  );
}

export default function Organization() {
  const [search, setSearch] = useState("");
  const { data } = useAsyncData(() => import("../../data/orgSample.js"));

  const stats = useMemo(() => {
    if (!data) return null;
    const sample = data.default;
    const tree = sample.large?.org || sample.standard.org;
    return getOrgStats(tree);
  }, [data]);

  return (
    <div className="organization-page">
      <header className="org-header">
        <div className="org-header-left">
          <div className="org-title-row">
            <h1 className="org-title">Organization</h1>
            {stats && <span className="org-badge">{stats.total} employees</span>}
          </div>
          <p className="org-sub">Explore structure, reporting lines, and roles across Nexus.</p>
        </div>
        <div className="org-header-actions">
          <button className="org-export-btn" onClick={() => window.print()}>
            <PrintIcon />
            Export
          </button>
        </div>
      </header>

      {stats && (
        <div className="org-stats">
          <StatCard icon="users"  label="Total Employees"   value={stats.total} color="blue" />
          <StatCard icon="layout" label="Departments"       value={stats.units} color="purple" />
          <StatCard icon="branch" label="Reporting Levels"  value={stats.reportingLevels} color="emerald" />
          <StatCard icon="check"  label="Individual Contributors" value={stats.individualContributors} color="amber" />
        </div>
      )}

      <div className="org-chart-card">
        <div className="org-toolbar">
          <div className="org-search-wrap">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search by name or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="org-search-input"
            />
          </div>
          {search && (
            <button className="org-clear-btn" onClick={() => setSearch("")}>Clear</button>
          )}
        </div>
        <div className="org-chart-body">
          <OrgChartView searchQuery={search} />
        </div>
      </div>
    </div>
  );
}
