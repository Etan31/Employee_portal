export function NexusLogo({ expanded }) {
  return (
    <div className={`nx-nexus-logo ${expanded ? "nx-nexus-logo--expanded" : "nx-nexus-logo--collapsed"}`}>
      <svg width="30" height="30" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" rx="9" fill="var(--nx-logo-bg)" />
        <text
          x="16"
          y="17"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fontWeight="800"
          fontSize="19"
          fill="var(--nx-accent)"
        >
          N
        </text>
      </svg>
      {expanded && <span className="nx-nexus-logo__label">Nexus</span>}
    </div>
  );
}
