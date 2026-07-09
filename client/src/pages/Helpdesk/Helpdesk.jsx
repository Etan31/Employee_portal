import { useMemo, useState } from "react";
import { useAsyncData } from "../../hooks/useAsyncData.js";
import { Icon } from "../../components/Icon/Icon.jsx";
import "./Helpdesk.css";

// Maps a ticket status to the shared .nx-status-pill modifier in global.css
const STATUS_PILL = {
  Open: "neutral",
  "In Progress": "info",
  Resolved: "success",
};

function formatDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function Helpdesk() {
  const { data, loading, error } = useAsyncData(
    () => import("../../data/helpdesk.js"),
  );
  const [tickets, setTickets] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [description, setDescription] = useState("");
  const [subjectError, setSubjectError] = useState("");

  const list = tickets ?? data?.TICKETS ?? null;

  const categoryLabels = useMemo(() => {
    if (!data) return {};
    return Object.fromEntries(data.TICKET_CATEGORIES.map((c) => [c.id, c.label]));
  }, [data]);

  if (loading) {
    return (
      <div className="hd-page">
        <div className="nx-page-loading">
          <div className="nx-page-loading__spinner" />
        </div>
      </div>
    );
  }

  if (error || !data || !list) {
    return (
      <div className="hd-page">
        <h1 className="nx-h1">Helpdesk</h1>
        <p className="hd-load-error">Could not load the helpdesk. Please refresh the page.</p>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      setSubjectError("Subject is required.");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const newTicket = {
      id: `HD-${1000 + list.length + 1}`,
      subject: subject.trim(),
      categoryId: categoryId || data.TICKET_CATEGORIES[0].id,
      status: "Open",
      priority,
      createdAt: today,
      updatedAt: today,
    };
    setTickets([newTicket, ...list]);
    setSubject("");
    setCategoryId("");
    setPriority("Medium");
    setDescription("");
    setIsFormOpen(false);
  };

  return (
    <div className="hd-page">
      <header className="hd-header">
        <div>
          <h1 className="nx-h1">Helpdesk</h1>
          <p className="hd-sub">Raise a ticket or find answers to common questions.</p>
        </div>
        <button className="hd-new-btn" onClick={() => setIsFormOpen((v) => !v)}>
          <Icon name="plus-circle" size={15} />
          <span>New Ticket</span>
        </button>
      </header>

      {isFormOpen && (
        <form className="nx-card hd-form" onSubmit={handleSubmit}>
          <div className="hd-form__row">
            <div className="hd-form__group hd-form__group--grow">
              <label className="hd-form__label" htmlFor="hd-subject">
                Subject
              </label>
              <input
                id="hd-subject"
                type="text"
                className="hd-form__input"
                placeholder="Briefly describe the issue"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  if (subjectError) setSubjectError("");
                }}
                aria-invalid={Boolean(subjectError)}
              />
              {subjectError && <span className="hd-form__error">{subjectError}</span>}
            </div>
            <div className="hd-form__group">
              <label className="hd-form__label" htmlFor="hd-category">
                Category
              </label>
              <select
                id="hd-category"
                className="hd-form__select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="" disabled>
                  Select category
                </option>
                {data.TICKET_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="hd-form__group">
              <label className="hd-form__label" htmlFor="hd-priority">
                Priority
              </label>
              <select
                id="hd-priority"
                className="hd-form__select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {data.TICKET_PRIORITIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="hd-form__group">
            <label className="hd-form__label" htmlFor="hd-description">
              Description
            </label>
            <textarea
              id="hd-description"
              className="hd-form__textarea"
              placeholder="Add any details that will help us resolve this faster"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="hd-form__actions">
            <button
              type="button"
              className="hd-form__cancel"
              onClick={() => setIsFormOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="hd-form__submit">
              Submit Ticket
            </button>
          </div>
        </form>
      )}

      <section className="hd-section">
        <h2 className="nx-h2 hd-section__title">My Tickets</h2>
        {list.length === 0 ? (
          <p className="hd-empty">You have not raised any tickets yet.</p>
        ) : (
          <ul className="hd-tickets">
            {list.map((t, i) => (
              <li
                key={t.id}
                className="nx-card hd-ticket"
                style={{ animationDelay: `${Math.min(i * 35, 140)}ms` }}
              >
                <div className="hd-ticket__main">
                  <span className="hd-ticket__id">{t.id}</span>
                  <p className="hd-ticket__subject">{t.subject}</p>
                </div>
                <div className="hd-ticket__meta">
                  <span className="hd-ticket__category">{categoryLabels[t.categoryId]}</span>
                  <span className={`nx-status-pill nx-status-pill--${STATUS_PILL[t.status]}`}>
                    {t.status}
                  </span>
                  <span className="hd-ticket__date">Updated {formatDate(t.updatedAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="hd-section">
        <h2 className="nx-h2 hd-section__title">Frequently Asked Questions</h2>
        <ul className="hd-faq">
          {data.FAQS.map((faq) => {
            const isOpen = expandedFaq === faq.id;
            return (
              <li key={faq.id} className="nx-card hd-faq-item">
                <button
                  className="hd-faq-item__question"
                  onClick={() => setExpandedFaq(isOpen ? null : faq.id)}
                  aria-expanded={isOpen}
                  aria-controls={`hd-faq-answer-${faq.id}`}
                >
                  <span>{faq.question}</span>
                  <Icon
                    name="arrow-right"
                    size={15}
                    className={`hd-faq-item__chevron ${isOpen ? "hd-faq-item__chevron--open" : ""}`}
                  />
                </button>
                {isOpen && (
                  <p className="hd-faq-item__answer" id={`hd-faq-answer-${faq.id}`}>
                    {faq.answer}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
