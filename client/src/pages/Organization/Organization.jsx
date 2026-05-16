import OrgChartView from "../../components/OrgChartView/OrgChartView";
import "./Organization.css";

export default function Organization() {
  return (
    <div className="organization-page">
      <header className="org-header">
        <div>
          <h2>Organization</h2>
          <p className="org-sub">Explore the structure of your organization.</p>
        </div>
        <div className="org-note">
          Design preview with list, tree, and org views.
        </div>
      </header>

      <main className="org-main">
        <div className="org-content-card">
          <OrgChartView />
        </div>
      </main>
    </div>
  );
}
