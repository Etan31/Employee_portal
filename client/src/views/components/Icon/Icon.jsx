import React from "react";
import "./Icon.css";

const icons = {
  "layout-dashboard": (
    <path d="M3 3h7v9H3zm11 0h7v5h-7zm0 9h7v9h-7zM3 16h7v5H3z" />
  ),
  "list-checks": (
    <path d="M3 6h18M3 12h18M3 18h18M8 6l2 2 4-4M8 12l2 2 4-4M8 18l2 2 4-4" />
  ),
  user: (
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
  ),
  clock: (
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2" />
  ),
  users: (
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  ),
  receipt: (
    <path d="M4 2v20l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2V2L18 4l-2-2-2 2-2-2-2 2-2-2-2 2zM16 10H8M16 14H8M12 6H8" />
  ),
  "user-plus": (
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M23 11h-6" />
  ),
  "trending-up": <path d="m23 6-9.5 9.5-5-5L1 18M17 6h6v6" />,
  "file-text": (
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" />
  ),
  "message-square": (
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  ),
  calendar: <path d="M3 4h18v18H3zM16 2v4M8 2v4M3 10h18" />,
  network: (
    <path d="M17 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM12 13a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM22 20a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 20a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM12 5v6M9 14l-2 4M11 14l5 4" />
  ),
  "git-branch": (
    <path d="M7 21a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM21 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM5 7v10M17 7v3.5A3.5 3.5 0 0 1 13.5 14H5" />
  ),
  "calendar-plus": (
    <path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8M16 2v4M8 2v4M3 10h18M19 16v6M16 19h6" />
  ),
  workflow: (
    <>
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="15" y="15" width="6" height="6" rx="1" />
      <path d="M6 9v2a2 2 0 0 0 2 2h8a2 2 0 0 1 2 2v2" />
      <path d="M14 13l4 2 4-2" />
    </>
  ),
  "file-edit": (
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M10.5 17.5L14 14l-2-2-3.5 3.5v2h2z" />
  ),
  "thumbs-up": (
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  ),
  plane: (
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.6l-1 2.2c-.2.5.1 1.1.6 1.3l6.5 2.5-3.5 3.5-3.2-.8c-.4-.1-.8 0-1 .4l-.8 1.4c-.2.4 0 .9.4 1.1l4.5 2 2 4.5c.2.4.7.6 1.1.4l1.4-.8c.4-.2.5-.6.4-1l-.8-3.2 3.5-3.5 2.5 6.5c.2.5.8.8 1.3.6l2.2-1c.4-.2.7-.6.6-1.1z" />
  ),
  cake: (
    <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1M2 21h20M7 8v2M12 8v2M17 8v2M7 4h.01M12 4h.01M17 4h.01" />
  ),
  award: (
    <path d="M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
  ),
  sparkle: (
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  ),
  play: <path d="m5 3 14 9-14 9z" />,
  search: <path d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />,
  bell: (
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
  ),
  "arrow-right": <path d="M5 12h14M12 5l7 7-7 7" />,
};

export function Icon({ name, className = "", size = 20 }) {
  const path = icons[name] || icons["layout-dashboard"];
  return (
    <svg
      className={`nx-icon nx-icon--${name} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {path}
    </svg>
  );
}
