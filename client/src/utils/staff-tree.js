/** Build the organization view from the same work-safe directory as staff search. */
export function staffTree(people) {
  const nodes = new Map(people.map(person => [person.id, { key: person.id, label: person.name,
    data: { profile: { name: person.name, position: person.position, email: person.email, unit: person.unit } }, children: [] }]));
  const roots = [];
  for (const person of people) {
    const node = nodes.get(person.id);
    const parent = nodes.get(person.manager_id);
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}
