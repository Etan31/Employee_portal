import React from "react";
import OrgChartView from "../../components/OrgChartView/OrgChartView";
import "./Organization.css";

export default function Organization() {
  return (
    <div className="organization-page">
      <header className="org-header">
        <h2>Organization</h2>
        <p className="org-sub">
          Choose a view to explore the organization structure.
        </p>
      </header>

      <main className="org-main">
        <OrgChartView />
      </main>
    </div>
  );
}
