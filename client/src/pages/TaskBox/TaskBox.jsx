import React, { useState, useEffect } from "react";
import { TASKS } from "../../data/tasks.js";
import { ME } from "../../data/people.js";
import { formatDate, formatShortDate, isOverdue } from "../../utils/format.js";
import { Icon } from "../../components/Icon/Icon.jsx";
import "./TaskBox.css";

export function TaskBox({ isDashboard }) {
  const [filter, setFilter] = useState("assigned");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const assignedTasks = TASKS.filter((t) => t.assignee.id === ME.id);
  const raisedTasks = TASKS.filter((t) => t.assigner.id === ME.id);

  const baseTask = filter === "assigned" ? assignedTasks : raisedTasks;
  const currentTasks =
    priorityFilter === "all"
      ? baseTask
      : baseTask.filter((t) => t.priority === priorityFilter);

  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (currentTasks.length > 0) {
      setSelectedId(currentTasks[0].id);
    } else {
      setSelectedId(null);
    }
  }, [filter, currentTasks.length]);

  const selectedTask = currentTasks.find((t) => t.id === selectedId);

  const priorityOptions = [
    { value: "all", label: "All", count: baseTask.length },
    { value: "HIGH", label: "High", count: baseTask.filter((t) => t.priority === "HIGH").length },
    { value: "MEDIUM", label: "Med", count: baseTask.filter((t) => t.priority === "MEDIUM").length },
    { value: "LOW", label: "Low", count: baseTask.filter((t) => t.priority === "LOW").length },
  ];

  return (
    <section className={`nx-taskbox ${isDashboard ? "nx-taskbox--dashboard" : ""}`}>
      {/* Left pane */}
      <aside className="nx-taskbox__list-pane">
        <header className="nx-taskbox__header">
          <div className="nx-taskbox__header-top">
            <div className="nx-taskbox__header-info">
              <h2 className="nx-taskbox__title">Tasks</h2>
              <p className="nx-taskbox__subtitle">
                Track work assigned to you and requests you have raised.
              </p>
            </div>
            {!isDashboard && (
              <button
                className="nx-taskbox__create-btn"
                onClick={() => setIsModalOpen(true)}
              >
                <Icon name="user-plus" size={15} />
                <span>Create</span>
              </button>
            )}
          </div>

          <div className="nx-segment-control" role="tablist">
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
            <div className="nx-priority-tabs" role="group" aria-label="Filter by priority">
              {priorityOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`nx-priority-tab ${priorityFilter === opt.value ? "active" : ""} ${opt.value !== "all" ? `nx-priority-tab--${opt.value.toLowerCase()}` : ""}`}
                  onClick={() => setPriorityFilter(opt.value)}
                >
                  {opt.label}
                  {opt.count > 0 && <span className="nx-priority-tab__count">{opt.count}</span>}
                </button>
              ))}
            </div>
          )}
        </header>

        <ul className="nx-taskbox__list">
          {currentTasks.length === 0 ? (
            <li className="nx-taskbox__empty">
              <Icon name="list-checks" size={40} className="nx-taskbox__empty-icon" />
              <p>No tasks found.</p>
            </li>
          ) : (
            currentTasks.map((task) => {
              const otherParty = filter === "assigned" ? task.assigner : task.assignee;
              return (
                <li key={task.id}>
                  <article
                    className={`nx-task-card ${selectedId === task.id ? "nx-task-card--selected" : ""} nx-task-card--priority-${task.priority.toLowerCase()}`}
                    onClick={() => setSelectedId(task.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedId(task.id)}
                  >
                    <div className="nx-task-card__priority-bar" aria-hidden="true" />
                    <div className="nx-task-card__body">
                      <div className="nx-task-card__head">
                        <span className="nx-task-card__title">{task.title}</span>
                        <span className="nx-task-card__date">{formatShortDate(task.dueDate)}</span>
                      </div>
                      <p className="nx-task-card__desc">{task.description}</p>
                      <div className="nx-task-card__foot">
                        <span className={`nx-status-pill nx-status-pill--${task.status.toLowerCase()}`}>
                          {task.status.replace("_", " ")}
                        </span>
                        <div className="nx-task-card__avatar" title={otherParty.name}>
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
            <Icon name="file-text" size={40} className="nx-taskbox__empty-icon" />
            <p>Select a task to view details.</p>
          </div>
        ) : (
          <article className="nx-task-detail">
            <header className="nx-task-detail__header">
              <div className="nx-task-detail__chips">
                <span className="nx-chip nx-chip--type">
                  {selectedTask.issueType || "TASK"}
                </span>
                <span className={`nx-chip nx-chip--status nx-chip--status-${selectedTask.status.toLowerCase()}`}>
                  {selectedTask.status.replace("_", " ")}
                </span>
                {isOverdue(selectedTask.dueDate) && (
                  <span className="nx-chip nx-chip--danger">Overdue</span>
                )}
              </div>
              <div className={`nx-priority-flag nx-priority-flag--${selectedTask.priority.toLowerCase()}`}>
                <Icon name={`priority-${selectedTask.priority.toLowerCase()}`} size={14} />
                <span>{selectedTask.priority}</span>
              </div>
            </header>

            <h1 className="nx-task-detail__title">{selectedTask.title}</h1>

            <div className="nx-task-detail__meta-row">
              <div className="nx-meta-cell">
                <span className="nx-meta-cell__label">Priority</span>
                <span className={`nx-meta-cell__value nx-meta-cell__value--${selectedTask.priority.toLowerCase()}`}>
                  {selectedTask.priority}
                </span>
              </div>
              <div className="nx-meta-cell">
                <span className="nx-meta-cell__label">Due Date</span>
                <span className="nx-meta-cell__value">{formatShortDate(selectedTask.dueDate)}</span>
              </div>
              <div className="nx-meta-cell">
                <span className="nx-meta-cell__label">Status</span>
                <span className="nx-meta-cell__value">{selectedTask.status.replace("_", " ")}</span>
              </div>
              <div className="nx-meta-cell">
                <span className="nx-meta-cell__label">Created</span>
                <span className="nx-meta-cell__value">{formatDate(new Date(selectedTask.createdDate))}</span>
              </div>
            </div>

            <div className="nx-task-detail__divider" />

            <section className="nx-task-detail__section">
              <h3 className="nx-detail-section-title">Description</h3>
              <p className="nx-task-detail__desc-text">{selectedTask.description}</p>
            </section>

            <div className="nx-task-detail__field-grid">
              <div className="nx-detail-field">
                <span className="nx-detail-field__label">Assignee</span>
                <div className="nx-detail-field__person">
                  <div className="nx-detail-avatar">{selectedTask.assignee.initials}</div>
                  <span>{selectedTask.assignee.name}</span>
                </div>
              </div>
              <div className="nx-detail-field">
                <span className="nx-detail-field__label">Reporter</span>
                <div className="nx-detail-field__person">
                  <div className="nx-detail-avatar nx-detail-avatar--alt">
                    {selectedTask.reporter?.initials || selectedTask.assigner.initials}
                  </div>
                  <span>{selectedTask.reporter?.name || selectedTask.assigner.name}</span>
                </div>
              </div>
              <div className="nx-detail-field">
                <span className="nx-detail-field__label">Labels</span>
                <div className="nx-detail-field__labels">
                  {(selectedTask.labels || []).length === 0 ? (
                    <span className="nx-detail-field__empty">No labels added</span>
                  ) : (
                    (selectedTask.labels || []).map((label) => (
                      <span key={label} className="nx-label-chip">{label}</span>
                    ))
                  )}
                </div>
              </div>
              <div className="nx-detail-field">
                <span className="nx-detail-field__label">Linked Issues</span>
                {(selectedTask.linkedIssues || []).length === 0 ? (
                  <span className="nx-detail-field__empty">No linked issues</span>
                ) : (
                  (selectedTask.linkedIssues || []).map((issue) => (
                    <div key={issue.id} className="nx-linked-issue-row">
                      <span className="nx-linked-issue-row__id">{issue.id}</span>
                      <span className="nx-linked-issue-row__title">{issue.title}</span>
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

      {isModalOpen && <CreateTaskModal onClose={() => setIsModalOpen(false)} />}
    </section>
  );
}

function CreateTaskModal({ onClose }) {
  const [priority, setPriority] = useState("Medium");
  const [labels, setLabels] = useState([]);
  const [labelText, setLabelText] = useState("");
  const [suggestedLabels] = useState([
    "Frontend",
    "Backend",
    "UI/UX",
    "Bug",
    "Feature",
    "Security",
  ]);

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

  const filteredLabels = suggestedLabels.filter(
    (l) => l.toLowerCase().includes(labelText.toLowerCase()) && !labels.includes(l),
  );

  const addLabel = (label) => {
    setLabels([...labels, label]);
    setLabelText("");
  };

  return (
    <div className="nx-modal-overlay" onClick={onClose}>
      <section
        className="nx-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-title"
      >
        <header className="nx-modal-header">
          <h2 className="nx-modal-title" id="modal-title">Create Task</h2>
          <button className="nx-modal-close" onClick={onClose} aria-label="Close modal">
            <Icon name="x" size={18} />
          </button>
        </header>

        <form className="nx-modal-body" onSubmit={(e) => e.preventDefault()}>
          <div className="nx-form-group">
            <label className="nx-form-label" htmlFor="task-title">Title</label>
            <input
              type="text"
              id="task-title"
              className="nx-form-input"
              placeholder="What needs to be done?"
            />
          </div>

          <div className="nx-form-row">
            <div className="nx-form-group">
              <label className="nx-form-label" htmlFor="issue-type">Issue Type</label>
              <select id="issue-type" className="nx-form-select">
                <option>Task</option>
                <option>Bug</option>
                <option>Story</option>
                <option>Epic</option>
              </select>
            </div>
            <div className="nx-form-group nx-form-group--priority">
              <label className="nx-form-label">Priority</label>
              <div className="nx-priority-selector" role="radiogroup" aria-label="Priority selector">
                {["Urgent", "High", "Medium", "Low"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`nx-priority-btn nx-priority-btn--${p.toLowerCase()} ${priority === p ? "active" : ""}`}
                    onClick={() => setPriority(p)}
                    title={p}
                    aria-pressed={priority === p}
                  >
                    <Icon name={`priority-${p.toLowerCase()}`} size={16} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="nx-form-group">
            <label className="nx-form-label" htmlFor="task-description">Description</label>
            <textarea
              id="task-description"
              className="nx-form-textarea"
              placeholder="Add more details..."
            />
          </div>

          <div className="nx-form-row">
            <div className="nx-form-group">
              <label className="nx-form-label" htmlFor="task-assignee">Assignee</label>
              <select id="task-assignee" className="nx-form-select">
                <option>Unassigned</option>
                <option>Tristan</option>
                <option>John Doe</option>
              </select>
            </div>
            <div className="nx-form-group">
              <label className="nx-form-label" htmlFor="task-reporter">Reporter</label>
              <select id="task-reporter" className="nx-form-select">
                <option>Me (Tristan)</option>
                <option>Manager</option>
              </select>
            </div>
          </div>

          <div className="nx-form-row">
            <div className="nx-form-group">
              <label className="nx-form-label" htmlFor="task-labels">Labels</label>
              <div className="nx-label-input-container">
                {labels.length > 0 && (
                  <div className="nx-labels-pills">
                    {labels.map((l) => (
                      <span key={l} className="nx-label-pill">
                        {l}
                        <button
                          type="button"
                          onClick={() => setLabels(labels.filter((x) => x !== l))}
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
                    if (e.key === "Enter" && labelText) addLabel(labelText);
                  }}
                  placeholder="Type to search or create..."
                />
                {labelText && (
                  <ul className="nx-label-suggestions">
                    {filteredLabels.map((l) => (
                      <li key={l} className="nx-suggestion-item" onClick={() => addLabel(l)}>{l}</li>
                    ))}
                    {!suggestedLabels.includes(labelText) && (
                      <li className="nx-suggestion-item nx-suggestion-item--new" onClick={() => addLabel(labelText)}>
                        Create: <strong>{labelText}</strong>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
            <div className="nx-form-group">
              <label className="nx-form-label" htmlFor="due-date">
                Due Date{priority === "Urgent" && <span className="nx-required"> *</span>}
              </label>
              <input
                type="date"
                id="due-date"
                className="nx-form-input"
                required={priority === "Urgent"}
              />
            </div>
          </div>

          <div className="nx-form-group">
            <label className="nx-form-label">Attachments</label>
            <div className="nx-attachments-container">
              <div className="nx-attachments-upload">
                <input
                  type="file"
                  id="attachments"
                  className="nx-attachments-input"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png,.gif"
                />
                <label htmlFor="attachments" className="nx-attachments-label">
                  <Icon name="file-text" size={20} />
                  <span>Click to upload or drag files</span>
                  <small>PDF, DOC, XLS, images up to 10 MB</small>
                </label>
              </div>
            </div>
          </div>

          <div className="nx-form-group">
            <label className="nx-form-label" htmlFor="linked-issues">Link Issues</label>
            <input
              type="text"
              id="linked-issues"
              className="nx-form-input"
              placeholder="Search or paste issue ID (e.g., PROJ-123)"
            />
            <div className="nx-linked-issues-list">
              <div className="nx-linked-issue-item">
                <div className="nx-linked-issue-badge">PROJ-101</div>
                <span className="nx-linked-issue-title">Update Employee Handbook</span>
                <button type="button" className="nx-linked-issue-remove" aria-label="Remove link">
                  <Icon name="x" size={14} />
                </button>
              </div>
            </div>
          </div>
        </form>

        <footer className="nx-modal-footer">
          <button type="button" className="nx-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="nx-btn-primary" onClick={onClose}>Create Task</button>
        </footer>
      </section>
    </div>
  );
}
