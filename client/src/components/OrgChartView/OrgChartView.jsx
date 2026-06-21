import { useState } from "react";
import "./OrgChartView.css";
import sampleData from "../../data/orgSample";

function nodeMatches(node, q) {
  if (!q) return true;
  const profile = node.data?.profile || {};
  const text = [profile.name || node.label || "", profile.position || ""].join(" ").toLowerCase();
  return text.includes(q);
}

function NodeCard({ node }) {
  const profile = node.data?.profile || {};
  const initials = (profile.name || node.label || "")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="node-card">
      <div className="node-top">
        <div className="avatar">
          {profile.avatar ? (
            <img src={profile.avatar} alt="profile" />
          ) : (
            <div className="avatar-placeholder">{initials}</div>
          )}
        </div>
        <div className="node-info">
          <div className="node-name">{profile.name || node.label}</div>
          <div className="node-position">{profile.position || "—"}</div>
          <div className="node-email">{profile.email || ""}</div>
        </div>
      </div>
    </div>
  );
}

function OrgNode({ node, searchQuery = "" }) {
  const q = searchQuery.toLowerCase().trim();
  const hasChildren = node.children && node.children.length > 0;
  const matches = nodeMatches(node, q);

  return (
    <div className="org-node-wrap" style={{ opacity: matches ? 1 : 0.15 }}>
      <NodeCard node={node} />
      {hasChildren && (
        <div className="org-children">
          {node.children.map((child, i) => (
            <OrgNode key={child.key || i} node={child} searchQuery={searchQuery} />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeNode({ node, depth = 0, searchQuery = "" }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const profile = node.data?.profile || {};
  const q = searchQuery.toLowerCase().trim();
  const matches = nodeMatches(node, q);

  return (
    <div className="tree-node" style={{ paddingLeft: depth * 20 }}>
      <div
        className="tree-row"
        style={{ opacity: matches ? 1 : 0.15 }}
        onClick={() => hasChildren && setOpen((o) => !o)}
      >
        {hasChildren ? (
          <span className="tree-toggle">{open ? "▾" : "▸"}</span>
        ) : (
          <span className="tree-toggle tree-leaf">•</span>
        )}
        <div>
          <span className="tree-label">{node.label}</span>
          {profile.position && (
            <span className="tree-meta">{profile.position}</span>
          )}
        </div>
      </div>
      {open &&
        hasChildren &&
        node.children.map((child, i) => (
          <TreeNode key={child.key || i} node={child} depth={depth + 1} searchQuery={searchQuery} />
        ))}
    </div>
  );
}

function ListView({ data, searchQuery = "" }) {
  const q = searchQuery.toLowerCase().trim();

  function flatten(nodes, result = []) {
    for (const n of nodes) {
      result.push(n);
      if (n.children) flatten(n.children, result);
    }
    return result;
  }
  const all = flatten(data);

  return (
    <div className="list-view simple-card">
      <table className="list-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Position</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {all.map((n, i) => {
            const profile = n.data?.profile || {};
            const rowText = [profile.name || n.label || "", profile.position || "", profile.email || ""].join(" ").toLowerCase();
            if (q && !rowText.includes(q)) return null;
            return (
              <tr key={i}>
                <td>{profile.name || n.label}</td>
                <td>{profile.position || "—"}</td>
                <td>
                  {profile.email ? (
                    <a href={`mailto:${profile.email}`}>{profile.email}</a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function OrgChartView({ searchQuery = "" }) {
  const [view, setView] = useState("org");
  const [variant, setVariant] = useState("standard");
  const current = sampleData[variant] || sampleData.standard;

  return (
    <div className="org-wrapper">
      <div className="org-controls">
        <div className="view-group">
          {sampleData.views.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="variant-group">
          {sampleData.variants.map((item) => (
            <button
              key={item.id}
              className={variant === item.id ? "active" : ""}
              onClick={() => setVariant(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="view-area">
        {view === "list" && <ListView data={current.org} searchQuery={searchQuery} />}

        {view === "tree" && (
          <div className="tree-view simple-card">
            {current.tree.map((n, i) => (
              <TreeNode key={n.key || i} node={n} searchQuery={searchQuery} />
            ))}
          </div>
        )}

        {view === "org" && (
          <div className="org-view simple-card animate-zoom">
            <div className="org-chart">
              {current.org.map((n, i) => (
                <OrgNode key={n.key || i} node={n} searchQuery={searchQuery} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
