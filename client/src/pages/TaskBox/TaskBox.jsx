import { useState, useEffect } from "react";
import { ME, ROSTER } from "../../data/people.js";
import { useAppData } from "../../hooks/appData.hooks.jsx";
import { formatDate, formatShortDate, isOverdue } from "../../utils/format.js";
import { Icon } from "../../components/Icon/Icon.jsx";
import "./TaskBox.css";

// Maps task status to the shared .nx-status-pill modifier in global.css
const STATUS_PILL = {
  OPEN: "neutral",
  IN_PROGRESS: "info",
  BLOCKED: "warning",
  DONE: "success",
};

const PEOPLE = [ME, ...ROSTER];

// Page-owned UI copy for the label autocomplete
const SUGGESTED_LABELS = [
  "Frontend",
  "Backend",
  "UI/UX",
  "Bug",
  "Feature",
  "Security",
];

export function TaskBox({ isDashboard }) {
  const { tasks, addTask, ready } = useAppData();
  const [filter, setFilter] = useState("assigned");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const assignedTasks = tasks.filter((t) => t.assignee.id === ME.id);
  const raisedTasks = tasks.filter((t) => t.assigner.id === ME.id);

  const baseTask = filter === "assigned" ? assignedTasks : raisedTasks;
  const currentTasks =
    priorityFilter === "all"
      ? baseTask
      : baseTask.filter((t) => t.priority === priorityFilter);

  // Falls back to the first task in the current list whenever the explicitly
  // selected id isn't in it (e.g. right after switching filters), without an
  // effect+setState round-trip.
  const effectiveSelectedId = currentTasks.some((t) => t.id === selectedId)
    ? selectedId
    : (currentTasks[0]?.id ?? null);
  const selectedTask = currentTasks.find((t) => t.id === effectiveSelectedId);

  // Store the new task, surface the list it lives in, and select it
  const handleCreateTask = (task) => {
    addTask(task);
    setFilter(task.assignee.id === ME.id ? "assigned" : "raised");
    setPriorityFilter("all");
    setSelectedId(task.id);
    setIsModalOpen(false);
  };

  const priorityOptions = [
    { value: "all", label: "All", count: baseTask.length },
    {
      value: "HIGH",
      label: "High",
      count: baseTask.filter((t) => t.priority === "HIGH").length,
    },
    {
      value: "MEDIUM",
      label: "Med",
      count: baseTask.filter((t) => t.priority === "MEDIUM").length,
    },
    {
      value: "LOW",
      label: "Low",
      count: baseTask.filter((t) => t.priority === "LOW").length,
    },
  ];

  if (!ready) {
    return (
      <div className="nx-page-loading">
        <div className="nx-page-loading__spinner" />
      </div>
    );
  }

  return (
    <section
      className={`nx-taskbox ${isDashboard ? "nx-taskbox--dashboard" : ""}`}
    >
      {/* Left pane */}
      <aside className="nx-taskbox__list-pane">
        <header className="nx-taskbox__header">
          <div className="nx-taskbox__header-top">
            <div className="nx-taskbox__header-info">
              <h1 className="nx-taskbox__title">Task Box</h1>
              <p className="nx-taskbox__subtitle">
                Track work assigned to you and requests you have raised.
              </p>
            </div>
            {!isDashboard && (
              <button
                className="nx-taskbox__create-btn"
                onClick={() => setIsModalOpen(true)}
              >
                <Icon name="plus-circle" size={15} />
                <span>Create</span>
              </button>
            )}
          </div>

          <div className="nx-segment-control" role="tablist" aria-label="Task list filter">
            <button
              role="tab"
              aria-selected={filter === "assigned"}
              className={`nx-segment-btn ${filter === "assigned" ? "active" : ""}`}
              onClick={() => setFilter("assigned")}
            >
              Assigned to Me
              <span className="nx-segment-badge">{assignedTasks.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={filter === "raised"}
              className={`nx-segment-btn ${filter === "raised" ? "active" : ""}`}
              onClick={() => setFilter("raised")}
            >
              Raised by Me
              <span className="nx-segment-badge">{raisedTasks.length}</span>
            </button>
          </div>

          {!isDashboard && (
            <div
              className="nx-priority-tabs"
              role="group"
              aria-label="Filter by priority"
            >
              {priorityOptions.map((opt) => (
                <button
                  key={opt.value}
                  aria-pressed={priorityFilter === opt.value}
                  className={`nx-priority-tab ${priorityFilter === opt.value ? "active" : ""} ${opt.value !== "all" ? `nx-priority-tab--${opt.value.toLowerCase()}` : ""}`}
                  onClick={() => setPriorityFilter(opt.value)}
                >
                  {opt.label}
                  {opt.count > 0 && (
                    <span className="nx-priority-tab__count">{opt.count}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </header>

        <ul className="nx-taskbox__list">
          {currentTasks.length === 0 ? (
            <li className="nx-taskbox__empty">
              <Icon
                name="list-checks"
                size={40}
                className="nx-taskbox__empty-icon"
              />
              <p>No tasks found.</p>
            </li>
          ) : (
            currentTasks.map((task) => {
              const otherParty =
                filter === "assigned" ? task.assigner : task.assignee;
              return (
                <li key={task.id}>
                  <article
                    className={`nx-task-card ${effectiveSelectedId === task.id ? "nx-task-card--selected" : ""} nx-task-card--priority-${task.priority.toLowerCase()}`}
                    onClick={() => setSelectedId(task.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === "Enter" && setSelectedId(task.id)
                    }
                  >
                    <div
                      className="nx-task-card__priority-bar"
                      aria-hidden="true"
                    />
                    <div className="nx-task-card__body">
                      <div className="nx-task-card__head">
                        <span className="nx-task-card__title">
                          {task.title}
                        </span>
                        <span className="nx-task-card__date">
                          {formatShortDate(task.dueDate)}
                        </span>
                      </div>
                      <p className="nx-task-card__desc">{task.description}</p>
                      <div className="nx-task-card__foot">
                        <span
                          className={`nx-status-pill nx-status-pill--${STATUS_PILL[task.status] || "neutral"}`}
                        >
                          {task.status.replace("_", " ")}
                        </span>
                        <div
                          className="nx-task-card__avatar"
                          title={otherParty.name}
                        >
                          {otherParty.initials}
                        </div>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      {/* Right pane */}
      <section className="nx-taskbox__detail-pane">
        {!selectedTask ? (
          <div className="nx-taskbox__empty nx-taskbox__empty--detail">
            <Icon
              name="file-text"
              size={40}
              className="nx-taskbox__empty-icon"
            />
            <p>Select a task to view details.</p>
          </div>
        ) : (
          <article className="nx-task-detail" key={selectedTask.id}>
            <header className="nx-task-detail__header">
              <div className="nx-task-detail__chips">
                <span className="nx-chip nx-chip--type">
                  {selectedTask.issueType || "TASK"}
                </span>
                <span
                  className={`nx-status-pill nx-status-pill--${STATUS_PILL[selectedTask.status] || "neutral"}`}
                >
                  {selectedTask.status.replace("_", " ")}
                </span>
                {isOverdue(selectedTask.dueDate) && (
                  <span className="nx-status-pill nx-status-pill--danger">
                    Overdue
                  </span>
                )}
              </div>
              <div
                className={`nx-priority-flag nx-priority-flag--${selectedTask.priority.toLowerCase()}`}
              >
                <Icon
                  name={`priority-${selectedTask.priority.toLowerCase()}`}
                  size={14}
                />
                <span>{selectedTask.priority}</span>
              </div>
            </header>

            <h2 className="nx-task-detail__title">{selectedTask.title}</h2>

            <div className="nx-task-detail__meta-row">
              <div className="nx-meta-cell">
                <span className="nx-meta-cell__label">Priority</span>
                <span
                  className={`nx-meta-cell__value nx-meta-cell__value--${selectedTask.priority.toLowerCase()}`}
                >
                  {selectedTask.priority}
                </span>
              </div>
              <div className="nx-meta-cell">
                <span className="nx-meta-cell__label">Due Date</span>
                <span className="nx-meta-cell__value">
                  {formatShortDate(selectedTask.dueDate)}
                </span>
              </div>
              <div className="nx-meta-cell">
                <span className="nx-meta-cell__label">Status</span>
                <span className="nx-meta-cell__value">
                  {selectedTask.status.replace("_", " ")}
                </span>
              </div>
              <div className="nx-meta-cell">
                <span className="nx-meta-cell__label">Created</span>
                <span className="nx-meta-cell__value">
                  {formatDate(new Date(selectedTask.createdDate))}
                </span>
              </div>
            </div>

            <div className="nx-task-detail__divider" />

            <section className="nx-task-detail__section">
              <h3 className="nx-detail-section-title">Description</h3>
              <p className="nx-task-detail__desc-text">
                {selectedTask.description}
              </p>
            </section>

            <div className="nx-task-detail__field-grid">
              <div className="nx-detail-field">
                <span className="nx-detail-field__label">Assignee</span>
                <div className="nx-detail-field__person">
                  <div className="nx-detail-avatar">
                    {selectedTask.assignee.initials}
                  </div>
                  <span>{selectedTask.assignee.name}</span>
                </div>
              </div>
              <div className="nx-detail-field">
                <span className="nx-detail-field__label">Reporter</span>
                <div className="nx-detail-field__person">
                  <div className="nx-detail-avatar nx-detail-avatar--alt">
                    {selectedTask.reporter?.initials ||
                      selectedTask.assigner.initials}
                  </div>
                  <span>
                    {selectedTask.reporter?.name || selectedTask.assigner.name}
                  </span>
                </div>
              </div>
              <div className="nx-detail-field">
                <span className="nx-detail-field__label">Labels</span>
                <div className="nx-detail-field__labels">
                  {(selectedTask.labels || []).length === 0 ? (
                    <span className="nx-detail-field__empty">
                      No labels added
                    </span>
                  ) : (
                    (selectedTask.labels || []).map((label) => (
                      <span key={label} className="nx-label-chip">
                        {label}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div className="nx-detail-field">
                <span className="nx-detail-field__label">Linked Issues</span>
                {(selectedTask.linkedIssues || []).length === 0 ? (
                  <span className="nx-detail-field__empty">
                    No linked issues
                  </span>
                ) : (
                  (selectedTask.linkedIssues || []).map((issue) => (
                    <div key={issue.id} className="nx-linked-issue-row">
                      <span className="nx-linked-issue-row__id">
                        {issue.id}
                      </span>
                      <span className="nx-linked-issue-row__title">
                        {issue.title}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {(selectedTask.attachments || []).length > 0 && (
              <section className="nx-task-detail__section">
                <h3 className="nx-detail-section-title">Attachments</h3>
                <ul className="nx-attachments-list">
                  {selectedTask.attachments.map((file) => (
                    <li key={file} className="nx-attachment-row">
                      <Icon name="file-text" size={15} />
                      <span>{file}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>
        )}
      </section>

      {isModalOpen && (
        <CreateTaskModal
          onClose={() => setIsModalOpen(false)}
          onCreate={handleCreateTask}
        />
      )}
    </section>
  );
}

function CreateTaskModal({ onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const [issueType, setIssueType] = useState("Task");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [assigneeId, setAssigneeId] = useState(ME.id);
  const [reporterId, setReporterId] = useState(ME.id);
  const [dueDate, setDueDate] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [labels, setLabels] = useState([]);
  const [labelText, setLabelText] = useState("");

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const scrollComp = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollComp > 0) document.body.style.paddingRight = `${scrollComp}px`;
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = "";
    };
  }, []);

  const filteredLabels = SUGGESTED_LABELS.filter(
    (l) =>
      l.toLowerCase().includes(labelText.toLowerCase()) && !labels.includes(l),
  );

  const addLabel = (label) => {
    setLabels([...labels, label]);
    setLabelText("");
  };

  const findPerson = (id) => PEOPLE.find((p) => p.id === id) || ME;

  // Builds a record matching the TASKS shape and hands it to the shared store
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError("Title is required.");
      return;
    }
    const now = new Date();
    onCreate({
      id: `TASK-${Date.now()}`,
      title: title.trim(),
      issueType,
      description: description.trim(),
      status: "OPEN",
      priority: priority.toUpperCase(),
      assigner: ME,
      reporter: findPerson(reporterId),
      assignee: findPerson(assigneeId),
      labels,
      linkedIssues: [],
      attachments,
      createdDate: now.toISOString(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : now.toISOString(),
    });
  };

  return (
    <div className="nx-modal-overlay" onClick={onClose}>
      <section
        className="nx-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header className="nx-modal-header">
          <h2 className="nx-modal-title" id="modal-title">
            Create Task
          </h2>
          <button
            className="nx-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <Icon name="x" size={18} />
          </button>
        </header>

        <form
          id="nx-create-task-form"
          className="nx-modal-body"
          onSubmit={handleSubmit}
        >
          <div className="nx-form-group">
            <label className="nx-form-label" htmlFor="task-title">
              Title
            </label>
            <input
              type="text"
              id="task-title"
              className="nx-form-input"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError("");
              }}
              aria-invalid={Boolean(titleError)}
              aria-describedby={titleError ? "task-title-error" : undefined}
            />
            {titleError && (
              <span className="nx-form-error" id="task-title-error">
                {titleError}
              </span>
            )}
          </div>

          <div className="nx-form-row">
            <div className="nx-form-group">
              <label className="nx-form-label" htmlFor="issue-type">
                Issue Type
              </label>
              <select
                id="issue-type"
                className="nx-form-select"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
              >
                <option>Task</option>
                <option>Bug</option>
                <option>Question</option>
                <option>Feature</option>
              </select>
            </div>
            <div className="nx-form-group nx-form-group--priority">
              <label className="nx-form-label">Priority</label>
              <div
                className="nx-priority-selector"
                role="radiogroup"
                aria-label="Priority"
              >
                {["Urgent", "High", "Medium", "Low"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    className={`nx-priority-btn nx-priority-btn--${p.toLowerCase()} ${priority === p ? "active" : ""}`}
                    onClick={() => setPriority(p)}
                    title={p}
                    aria-label={`${p} priority`}
                    aria-checked={priority === p}
                  >
                    <Icon name={`priority-${p.toLowerCase()}`} size={16} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="nx-form-group">
            <label className="nx-form-label" htmlFor="task-description">
              Description
            </label>
            <textarea
              id="task-description"
              className="nx-form-textarea"
              placeholder="Add more details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="nx-form-row">
            <div className="nx-form-group">
              <label className="nx-form-label" htmlFor="task-assignee">
                Assignee
              </label>
              <select
                id="task-assignee"
                className="nx-form-select"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                {PEOPLE.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id === ME.id ? `Me (${p.name})` : p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="nx-form-group">
              <label className="nx-form-label" htmlFor="task-reporter">
                Reporter
              </label>
              <select
                id="task-reporter"
                className="nx-form-select"
                value={reporterId}
                onChange={(e) => setReporterId(e.target.value)}
              >
                {PEOPLE.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id === ME.id ? `Me (${p.name})` : p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="nx-form-row">
            <div className="nx-form-group">
              <label className="nx-form-label" htmlFor="task-labels">
                Labels
              </label>
              <div className="nx-label-input-container">
                {labels.length > 0 && (
                  <div className="nx-labels-pills">
                    {labels.map((l) => (
                      <span key={l} className="nx-label-pill">
                        {l}
                        <button
                          type="button"
                          onClick={() =>
                            setLabels(labels.filter((x) => x !== l))
                          }
                          aria-label={`Remove label ${l}`}
                        >
                          <Icon name="x" size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  id="task-labels"
                  className="nx-label-input"
                  value={labelText}
                  onChange={(e) => setLabelText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && labelText) {
                      e.preventDefault();
                      addLabel(labelText);
                    }
                  }}
                  placeholder="Type to search or create..."
                />
                {labelText && (
                  <ul className="nx-label-suggestions">
                    {filteredLabels.map((l) => (
                      <li
                        key={l}
                        className="nx-suggestion-item"
                        onClick={() => addLabel(l)}
                      >
                        {l}
                      </li>
                    ))}
                    {!SUGGESTED_LABELS.includes(labelText) && (
                      <li
                        className="nx-suggestion-item nx-suggestion-item--new"
                        onClick={() => addLabel(labelText)}
                      >
                        Create: <strong>{labelText}</strong>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
            <div className="nx-form-group">
              <label className="nx-form-label" htmlFor="due-date">
                Due Date
                {priority === "Urgent" && (
                  <span className="nx-required"> *</span>
                )}
              </label>
              <input
                type="date"
                id="due-date"
                className="nx-form-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required={priority === "Urgent"}
              />
            </div>
          </div>

          <div className="nx-form-group">
            <label className="nx-form-label" htmlFor="attachments">
              Attachments
            </label>
            <div className="nx-attachments-container">
              <div className="nx-attachments-upload">
                <input
                  type="file"
                  id="attachments"
                  className="nx-attachments-input"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png,.gif"
                  onChange={(e) =>
                    setAttachments(
                      Array.from(e.target.files).map((f) => f.name),
                    )
                  }
                />
                <label htmlFor="attachments" className="nx-attachments-label">
                  <Icon name="file-text" size={20} />
                  <span>
                    {attachments.length > 0
                      ? attachments.join(", ")
                      : "Click to upload or drag files"}
                  </span>
                  <small>PDF, DOC, XLS, images up to 10 MB</small>
                </label>
              </div>
            </div>
          </div>
        </form>

        <footer className="nx-modal-footer">
          <button type="button" className="nx-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="nx-create-task-form"
            className="nx-btn-primary"
          >
            Create Task
          </button>
        </footer>
      </section>
    </div>
  );
}
