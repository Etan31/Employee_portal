import React, { useState } from "react";
import "./OrgChartView.css";
import sampleData from "../../data/orgSample";

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

function OrgNode({ node }) {
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div className="org-node-wrap">
      <NodeCard node={node} />
      {hasChildren && (
        <div className="org-children">
          {node.children.map((child, i) => (
            <OrgNode key={child.key || i} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeNode({ node, depth = 0 }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div className="tree-node" style={{ paddingLeft: depth * 20 }}>
      <div
        className="tree-row"
        onClick={() => hasChildren && setOpen((o) => !o)}
      >
        {hasChildren && <span className="tree-toggle">{open ? "▾" : "▸"}</span>}
        {!hasChildren && <span className="tree-toggle tree-leaf">•</span>}
        <span className="tree-label">{node.label}</span>
      </div>
      {open &&
        hasChildren &&
        node.children.map((child, i) => (
          <TreeNode key={child.key || i} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}

function ListView({ data }) {
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
            const p = n.data?.profile || {};
            return (
              <tr key={i}>
                <td>{p.name || n.label}</td>
                <td>{p.position || "—"}</td>
                <td>{p.email || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function OrgChartView() {
  const [view, setView] = useState("org");

  return (
    <div className="org-wrapper">
      <div className="view-controls">
        {["list", "tree", "org"].map((v) => (
          <button
            key={v}
            className={view === v ? "active" : ""}
            onClick={() => setView(v)}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      <div className="view-area">
        {view === "list" && <ListView data={sampleData.org} />}

        {view === "tree" && (
          <div className="tree-view simple-card">
            {sampleData.tree.map((n, i) => (
              <TreeNode key={n.key || i} node={n} />
            ))}
          </div>
        )}

        {view === "org" && (
          <div className="org-view simple-card animate-zoom">
            <div className="org-chart">
              {sampleData.org.map((n, i) => (
                <OrgNode key={n.key || i} node={n} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
