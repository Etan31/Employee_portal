import { useEffect, useRef } from "react";
import { ERROR_CONTENT } from "./errorContent.js";
import { Icon } from "../../components/Icon/Icon.jsx";
import { useAuth } from "../../hooks/auth.hooks.jsx";
import { useNavigation } from "../../hooks/useNavigation.js";
import { NAV_ITEMS } from "../../data/nav.js";
import { filterNavItemsByRole } from "../../utils/authPermissions.js";
import "./ErrorPage.css";

const LAST_ROUTE_KEY = "nx:lastValidRoute";

export function ErrorPage({
  code,
  standalone = false,
  detail,
  primaryAction,
  secondaryAction,
  showQuickLinks = false,
}) {
  const { navigate } = useNavigation();
  const { role } = useAuth();
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [code]);

  const { icon, title, message, tone } = ERROR_CONTENT[code] || ERROR_CONTENT[500];

  const goBack = () => {
    const lastRoute = sessionStorage.getItem(LAST_ROUTE_KEY);
    navigate(lastRoute ? `#/${lastRoute}` : "#/dashboard");
  };

  const primary = primaryAction || {
    label: "Go to Dashboard",
    onClick: () => navigate("#/dashboard"),
  };
  const secondary =
    secondaryAction === null ? null : secondaryAction || { label: "Go back", onClick: goBack };

  const quickLinks = showQuickLinks ? filterNavItemsByRole(NAV_ITEMS, role).slice(0, 4) : [];

  return (
    <div className={`nx-error${standalone ? " nx-error--standalone" : ""}`}>
      <div className="nx-card nx-error__card">
        <div className={`nx-error__icon nx-error__icon--${tone}`}>
          <Icon name={icon} size={28} />
        </div>
        <p className="nx-error__code">{code}</p>
        <h1 ref={headingRef} tabIndex={-1} className="nx-error__title">
          {title}
        </h1>
        <p className="nx-error__message">{message}</p>
        {detail && <p className="nx-error__detail">{detail}</p>}
        <div className="nx-error__actions">
          <button
            type="button"
            className="nx-error__btn nx-error__btn--primary"
            onClick={primary.onClick}
          >
            {primary.label}
          </button>
          {secondary && (
            <button
              type="button"
              className="nx-error__btn nx-error__btn--secondary"
              onClick={secondary.onClick}
            >
              {secondary.label}
            </button>
          )}
        </div>
        {quickLinks.length > 0 && (
          <div className="nx-error__links">
            <p className="nx-small">Quick links</p>
            <ul>
              {quickLinks.map((item) => (
                <li key={item.id}>
                  <a href={item.route}>{item.label}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function NotFound() {
  const { active } = useNavigation();
  return <ErrorPage code={404} detail={`We couldn't find "#/${active}".`} showQuickLinks />;
}

export function AuthError({ code }) {
  const { role } = useAuth();
  const { navigate } = useNavigation();

  if (code === 401) {
    return (
      <ErrorPage
        code={401}
        standalone
        secondaryAction={null}
        primaryAction={{ label: "Go to Sign In", onClick: () => navigate("#/login") }}
      />
    );
  }

  return <ErrorPage code={403} detail={`You're signed in as ${role}.`} showQuickLinks />;
}

export function ServerError({ code = 500, standalone }) {
  const resolvedStandalone = standalone !== undefined ? standalone : code === 503;

  return (
    <ErrorPage
      code={code}
      standalone={resolvedStandalone}
      primaryAction={
        resolvedStandalone
          ? { label: "Reload", onClick: () => window.location.reload() }
          : undefined
      }
      secondaryAction={resolvedStandalone ? null : undefined}
    />
  );
}
