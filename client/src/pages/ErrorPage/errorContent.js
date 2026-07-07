// Contract source for the 8 status codes documented in CLAUDE.md's
// "Error Pages & Status Codes" section. Tone drives color, not the icon choice:
// neutral = the user took a wrong turn, fault = something on our side broke.
export const ERROR_CONTENT = {
  400: {
    icon: "file-edit",
    tone: "neutral",
    title: "That request doesn't look right",
    message:
      "Something in the form or link was incomplete or invalid. Check the details and try again.",
  },
  401: {
    icon: "logout",
    tone: "neutral",
    title: "Your session has ended",
    message: "Sign in again to pick up where you left off.",
  },
  403: {
    icon: "shield",
    tone: "neutral",
    title: "You don't have access to this page",
    message:
      "Your role doesn't include permission for this section. Contact your administrator if this seems wrong.",
  },
  404: {
    icon: "search",
    tone: "neutral",
    title: "We couldn't find that page",
    message: "The link may be broken or the page may have moved.",
  },
  500: {
    icon: "priority-urgent",
    tone: "fault-severe",
    title: "Something went wrong on our end",
    message: "An unexpected error interrupted this page. Reloading usually fixes it.",
  },
  502: {
    icon: "network",
    tone: "fault-transient",
    title: "We couldn't reach a required service",
    message:
      "One of the services this page depends on isn't responding. This is usually temporary.",
  },
  503: {
    icon: "settings",
    tone: "fault-transient",
    title: "Nexus is temporarily unavailable",
    message: "We're performing scheduled maintenance. Please check back shortly.",
  },
  504: {
    icon: "clock",
    tone: "fault-transient",
    title: "That took too long to load",
    message: "The request timed out. Check your connection and try again.",
  },
};
