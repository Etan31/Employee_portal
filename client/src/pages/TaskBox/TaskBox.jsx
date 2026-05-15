import React, { useState, useEffect } from "react";
import { TASKS } from "../../data/tasks.js";
import { ME } from "../../data/people.js";
import { formatDate, formatShortDate, isOverdue } from "../../utils/format.js";
import { Icon } from "../../components/Icon/Icon.jsx";
import "./TaskBox.css";

function Dropdown({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="nx-dropdown">
      <button className="nx-dropdown__trigger" onClick={() => setOpen(!open)}>
        <span>
          {selected?.label} &middot; {selected?.count}
        </span>
        <span className={`nx-dropdown__chevron ${open ? "open" : ""}`} />
      </button>
      {open && (
        <div className="nx-dropdown__menu">
          {options.map((opt) => (
            <button
              key={opt.value}
              className={`nx-dropdown__item ${value === opt.value ? "active" : ""}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}{" "}
              <span className="nx-dropdown__count">{opt.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  }, [filter, currentTasks.length]); // re-run when filter changes

  const selectedTask = currentTasks.find((t) => t.id === selectedId);

  const filterOptions = [
    { value: "assigned", label: "Assigned to Me", count: assignedTasks.length },
    { value: "raised", label: "Raised by Me", count: raisedTasks.length },
  ];

  const priorityOptions = [
    { value: "all", label: "All Priorities", count: baseTask.length },
    {
      value: "HIGH",
      label: "High",
      count: baseTask.filter((t) => t.priority === "HIGH").length,
    },
    {
      value: "MEDIUM",
      label: "Medium",
      count: baseTask.filter((t) => t.priority === "MEDIUM").length,
    },
    {
      value: "LOW",
      label: "Low",
      count: baseTask.filter((t) => t.priority === "LOW").length,
    },
  ];

  return (
    <section
      className={`nx-card nx-taskbox ${isDashboard ? "nx-taskbox--dashboard" : ""}`}
    >
      {/* Left Pane - List */}
      <section className="nx-taskbox__list-pane">
        <header className="nx-taskbox__filter-bar">
          <div className="nx-taskbox__header-left">
            <p className="nx-taskbox__title">Tasks</p>
            <p className="nx-taskbox__subtitle">
              Track work assigned to you and requests you have raised.
            </p>
          </div>

          <div className="nx-taskbox__header-actions">
            <Dropdown
              options={filterOptions}
              value={filter}
              onChange={setFilter}
            />
            {!isDashboard && (
              <button
                className="nx-taskbox__create-btn"
                onClick={() => setIsModalOpen(true)}
              >
                <Icon name="user-plus" size={16} />
                <span>Create</span>
              </button>
            )}
          </div>
        </header>
        {!isDashboard && (
          <div className="nx-taskbox__priority-filter">
            <Dropdown
              options={priorityOptions}
              value={priorityFilter}
              onChange={setPriorityFilter}
            />
          </div>
        )}

        <ul className="nx-taskbox__list">
          {currentTasks.length === 0 ? (
            <li className="nx-taskbox__empty">
              <Icon
                name="list-checks"
                size={48}
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
                    className={`nx-task-item ${selectedId === task.id ? "nx-task-item--selected" : ""} ${task.priority === "HIGH" ? "nx-task-item--high" : ""}`}
                    onClick={() => setSelectedId(task.id)}
                  >
                    <header className="nx-task-item__header">
                      <div className="nx-task-item__title-wrapper">
                        <span
                          className={`nx-task-priority-badge nx-task-priority-badge--${task.priority.toLowerCase()}`}
                          title={task.priority}
                        >
                          <Icon
                            name={`priority-${task.priority.toLowerCase()}`}
                            size={14}
                          />
                        </span>
                        <span className="nx-task-item__title">
                          {task.title}
                        </span>
                      </div>
                      <span className="nx-task-item__date">
                        {formatShortDate(task.dueDate)}
                      </span>
                    </header>
                    <div className="nx-task-item__desc">{task.description}</div>
                    <footer className="nx-task-item__footer">
                      <span
                        className={`nx-task-status nx-task-status--${task.status.toLowerCase()}`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                      <div
                        className="nx-task-item__avatar"
                        title={otherParty.name}
                      >
                        {otherParty.initials}
                      </div>
                    </footer>
                  </article>
                </li>
              );
            })
          )}
        </ul>
      </section>

      {/* Right Pane - Detail */}
      <section className="nx-taskbox__detail-pane">
        {!selectedTask ? (
          <div className="nx-taskbox__empty nx-taskbox__empty--detail">
            <Icon
              name="file-text"
              size={48}
              className="nx-taskbox__empty-icon"
            />
            <p>Select a task to view details.</p>
          </div>
        ) : (
          <article className="nx-task-detail">
            <header className="nx-task-detail__header">
              <div className="nx-task-detail__heading">
                <div className="nx-task-detail__topline">
                  <span className="nx-task-detail__type">
                    {selectedTask.issueType || "Task"}
                  </span>
                  <span
                    className={`nx-task-status nx-task-status--${selectedTask.status.toLowerCase()} nx-task-detail__status`}
                  >
                    {selectedTask.status.replace("_", " ")}
                  </span>
                </div>

                <h2 className="nx-task-detail__title">{selectedTask.title}</h2>

                <div className="nx-task-detail__meta">
                  <span className="nx-task-detail__meta-item">
                    Priority: {selectedTask.priority}
                  </span>
                  <span className="nx-task-detail__meta-item">
                    Due {formatShortDate(selectedTask.dueDate)}
                  </span>
                  {isOverdue(selectedTask.dueDate) && (
                    <span className="nx-task-badge-danger">Overdue</span>
                  )}
                </div>
              </div>

              <div className="nx-task-priority-display">
                <div
                  className={`nx-priority-badge nx-priority-badge--${selectedTask.priority.toLowerCase()}`}
                >
                  <Icon
                    name={`priority-${selectedTask.priority.toLowerCase()}`}
                    size={16}
                  />
                  <span>{selectedTask.priority}</span>
                </div>
              </div>
            </header>

            <section className="nx-task-detail__section">
              <h4 className="nx-task-detail__label">Description</h4>
              <p className="nx-task-detail__text">{selectedTask.description}</p>
            </section>

            <section className="nx-task-detail__section nx-task-detail__field-grid">
              <div className="nx-task-detail__field">
                <h4 className="nx-task-detail__field-title">Assignee</h4>
                <p className="nx-task-detail__field-value">
                  {selectedTask.assignee.name}
                </p>
              </div>
              <div className="nx-task-detail__field">
                <h4 className="nx-task-detail__field-title">Reporter</h4>
                <p className="nx-task-detail__field-value">
                  {selectedTask.reporter?.name || selectedTask.assigner.name}
                </p>
              </div>
              <div className="nx-task-detail__field">
                <h4 className="nx-task-detail__field-title">Labels</h4>
                <div className="nx-task-detail__labels">
                  {(selectedTask.labels || []).map((label) => (
                    <span key={label} className="nx-task-detail__label-pill">
                      {label}
                    </span>
                  ))}
                  {(selectedTask.labels || []).length === 0 && (
                    <span className="nx-task-detail__field-value">
                      No labels added
                    </span>
                  )}
                </div>
              </div>
              <div className="nx-task-detail__field">
                <h4 className="nx-task-detail__field-title">Linked Issues</h4>
                {(selectedTask.linkedIssues || []).length > 0 ? (
                  <div className="nx-task-detail__links">
                    {selectedTask.linkedIssues.map((issue) => (
                      <div key={issue.id} className="nx-task-detail__link-item">
                        <span className="nx-task-detail__link-badge">
                          {issue.id}
                        </span>
                        <span>{issue.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="nx-task-detail__field-value">
                    No linked issues
                  </p>
                )}
              </div>
            </section>

            <section className="nx-task-detail__section nx-task-detail__field-grid">
              <div className="nx-task-detail__field">
                <h4 className="nx-task-detail__field-title">Attachments</h4>
                {(selectedTask.attachments || []).length > 0 ? (
                  <ul className="nx-task-detail__attachments-list">
                    {selectedTask.attachments.map((file) => (
                      <li key={file}>{file}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="nx-task-detail__field-value">No attachments</p>
                )}
              </div>
              <div className="nx-task-detail__field">
                <h4 className="nx-task-detail__field-title">Dates</h4>
                <p className="nx-task-detail__field-value">
                  Created: {formatDate(new Date(selectedTask.createdDate))}
                </p>
                <p className="nx-task-detail__field-value">
                  Due: {formatDate(new Date(selectedTask.dueDate))}
                </p>
              </div>
            </section>

            <section className="nx-task-detail__section">
              <h4 className="nx-task-detail__label">People</h4>
              <div className="nx-task-detail__people">
                <div className="nx-task-person">
                  <div className="nx-task-person__avatar">
                    {selectedTask.assignee.initials}
                  </div>
                  <span>{selectedTask.assignee.name}</span>
                </div>
                <Icon
                  name="arrow-right"
                  size={16}
                  className="nx-task-detail__arrow"
                />
                <div className="nx-task-person">
                  <div className="nx-task-person__avatar">
                    {selectedTask.assigner.initials}
                  </div>
                  <span>{selectedTask.assigner.name}</span>
                </div>
              </div>
            </section>
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
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollComp = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollComp > 0) {
      document.body.style.paddingRight = `${scrollComp}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  const filteredLabels = suggestedLabels.filter(
    (l) =>
      l.toLowerCase().includes(labelText.toLowerCase()) && !labels.includes(l),
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
          <h2 className="nx-modal-title" id="modal-title">
            Create Task
          </h2>
          <button
            className="nx-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <Icon name="x" size={20} />
          </button>
        </header>

        <form className="nx-modal-body" onSubmit={(e) => e.preventDefault()}>
          <div className="nx-form-row">
            <div className="nx-form-group">
              <label className="nx-form-label" htmlFor="issue-type">
                Issue Type
              </label>
              <select id="issue-type" className="nx-form-select">
                <option>Task</option>
                <option>Bug</option>
                <option>Story</option>
                <option>Epic</option>
              </select>
            </div>
            <div className="nx-form-group nx-form-group--priority">
              <label className="nx-form-label">Priority</label>
              <div
                className="nx-priority-selector"
                role="radiogroup"
                aria-label="Priority selector"
              >
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
            <label className="nx-form-label" htmlFor="task-description">
              Description
            </label>
            <textarea
              id="task-description"
              className="nx-form-textarea"
              placeholder="Add more details..."
            ></textarea>
          </div>

          <div className="nx-form-row">
            <div className="nx-form-group">
              <label className="nx-form-label" htmlFor="task-assignee">
                Assignee
              </label>
              <select id="task-assignee" className="nx-form-select">
                <option>Unassigned</option>
                <option>Tristan</option>
                <option>John Doe</option>
              </select>
            </div>
            <div className="nx-form-group">
              <label className="nx-form-label" htmlFor="task-reporter">
                Reporter
              </label>
              <select id="task-reporter" className="nx-form-select">
                <option>Me (Tristan)</option>
                <option>Manager</option>
              </select>
            </div>
          </div>

          <div className="nx-form-row">
            <div className="nx-form-group">
              <label className="nx-form-label" htmlFor="task-labels">
                Labels
              </label>
              <div className="nx-label-input-container">
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
                <input
                  type="text"
                  id="task-labels"
                  className="nx-label-input"
                  value={labelText}
                  onChange={(e) => setLabelText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && labelText) {
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
                    {labelText && !suggestedLabels.includes(labelText) && (
                      <li
                        className="nx-suggestion-item nx-suggestion-item--new"
                        onClick={() => addLabel(labelText)}
                      >
                        Create new: <strong>{labelText}</strong>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
            <div className="nx-form-group nx-form-group--date">
              <label className="nx-form-label" htmlFor="due-date">
                Due Date{" "}
                {priority === "Urgent" && (
                  <span className="nx-required">*</span>
                )}
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
                  <small>PDF, DOC, XLS, images up to 10MB</small>
                </label>
              </div>
            </div>
          </div>

          <div className="nx-form-group">
            <label className="nx-form-label" htmlFor="linked-issues">
              Link Issues
            </label>
            <input
              type="text"
              id="linked-issues"
              className="nx-form-input"
              placeholder="Search or paste issue ID (e.g., PROJ-123)"
            />
            <div className="nx-linked-issues-list">
              <div className="nx-linked-issue-item">
                <div className="nx-linked-issue-badge">PROJ-101</div>
                <span className="nx-linked-issue-title">
                  Update Employee Handbook
                </span>
                <button
                  type="button"
                  className="nx-linked-issue-remove"
                  aria-label="Remove link"
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            </div>
          </div>
        </form>

        <footer className="nx-modal-footer">
          <button type="button" className="nx-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="nx-btn-primary" onClick={onClose}>
            Create Task
          </button>
        </footer>
      </section>
    </div>
  );
}
