// Derive people/stats from the org tree in data/orgSample.js so pages never
// hardcode counts. Works on any variant's `org` node array
// (nodes: { key, label, children, data: { profile: { name, position, email } } }).

export function flattenOrgTree(nodes, depth = 0, unit = null, acc = []) {
  for (const node of nodes || []) {
    const profile = node.data?.profile;
    const isPerson = profile?.name && profile.position !== "Company";
    if (isPerson) {
      acc.push({
        key: node.key,
        name: profile.name,
        position: profile.position,
        email: profile.email || "",
        unit: unit || node.label,
        depth,
        hasReports: Boolean(node.children?.length),
      });
    }
    // Top-level branches (depth 1 under the company root) name the org unit.
    const nextUnit = depth === 0 ? node.label : unit || node.label;
    flattenOrgTree(node.children, depth + 1, depth === 1 ? node.label : nextUnit, acc);
  }
  return acc;
}

export function getOrgStats(orgNodes) {
  const people = flattenOrgTree(orgNodes);
  return {
    total: people.length,
    leaders: people.filter((p) => p.hasReports).length,
    units: new Set(people.map((p) => p.unit)).size,
    individualContributors: people.filter((p) => !p.hasReports).length,
    reportingLevels: people.length ? Math.max(...people.map((p) => p.depth)) : 0,
  };
}
