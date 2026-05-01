import React, { useState, useEffect } from 'react';
import { TASKS } from '../../../models/tasks.js';
import { ME } from '../../../models/people.js';
import { formatDate, formatShortDate, isOverdue } from '../../../controllers/format.js';
import { Icon } from '../../components/Icon/Icon.jsx';
import './TaskBox.css';

function Dropdown({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <div className="nx-dropdown">
      <button className="nx-dropdown__trigger" onClick={() => setOpen(!open)}>
        <span>{selected?.label} &middot; {selected?.count}</span>
        <Icon name="layout-dashboard" size={16} className={`nx-dropdown__chevron ${open ? 'open' : ''}`} />
        {/* Using a standard chevron if we had one, but we'll use a small trick with layout-dashboard or just a css arrow, actually wait, the prompt said "Add only icons you actually use", I will just use CSS border arrow for the chevron */}
      </button>
      {open && (
        <div className="nx-dropdown__menu">
          {options.map(opt => (
            <button 
              key={opt.value} 
              className={`nx-dropdown__item ${value === opt.value ? 'active' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              {opt.label} <span className="nx-dropdown__count">{opt.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskBox({ isDashboard }) {
  const [filter, setFilter] = useState('assigned');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const assignedTasks = TASKS.filter(t => t.assignee.id === ME.id);
  const raisedTasks = TASKS.filter(t => t.assigner.id === ME.id);
  
  const currentTasks = filter === 'assigned' ? assignedTasks : raisedTasks;
  
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (currentTasks.length > 0) {
      setSelectedId(currentTasks[0].id);
    } else {
      setSelectedId(null);
    }
  }, [filter, currentTasks.length]); // re-run when filter changes

  const selectedTask = currentTasks.find(t => t.id === selectedId);

  const filterOptions = [
    { value: 'assigned', label: 'Assigned to Me', count: assignedTasks.length },
    { value: 'raised', label: 'Raised by Me', count: raisedTasks.length },
  ];

  return (
    <div className={`nx-card nx-taskbox ${isDashboard ? 'nx-taskbox--dashboard' : ''}`}>
      
      {/* Left Pane - List */}
      <div className="nx-taskbox__list-pane">
        <div className="nx-taskbox__filter-bar">
          <Dropdown options={filterOptions} value={filter} onChange={setFilter} />
          {!isDashboard && (
            <button className="nx-taskbox__create-btn" onClick={() => setIsModalOpen(true)}>
              <Icon name="user-plus" size={16} />
              <span>Create</span>
            </button>
          )}
        </div>
        
        <div className="nx-taskbox__list">
          {currentTasks.length === 0 ? (
            <div className="nx-taskbox__empty">
              <Icon name="list-checks" size={48} className="nx-taskbox__empty-icon" />
              <p>No tasks found.</p>
            </div>
          ) : (
            currentTasks.map(task => {
              const otherParty = filter === 'assigned' ? task.assigner : task.assignee;
              return (
                <div 
                  key={task.id} 
                  className={`nx-task-item ${selectedId === task.id ? 'nx-task-item--selected' : ''} ${task.priority === 'HIGH' ? 'nx-task-item--high' : ''}`}
                  onClick={() => setSelectedId(task.id)}
                >
                  <div className="nx-task-item__header">
                    <span className="nx-task-item__title">{task.title}</span>
                    <span className="nx-task-item__date">{formatShortDate(task.dueDate)}</span>
                  </div>
                  <div className="nx-task-item__desc">{task.description}</div>
                  <div className="nx-task-item__footer">
                    <span className={`nx-task-status nx-task-status--${task.status.toLowerCase()}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    <div className="nx-task-item__avatar" title={otherParty.name}>
                      {otherParty.initials}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane - Detail */}
      <div className="nx-taskbox__detail-pane">
        {!selectedTask ? (
          <div className="nx-taskbox__empty nx-taskbox__empty--detail">
            <Icon name="file-text" size={48} className="nx-taskbox__empty-icon" />
            <p>Select a task to view details.</p>
          </div>
        ) : (
          <div className="nx-task-detail">
            <h2 className="nx-task-detail__title">{selectedTask.title}</h2>
            <span className={`nx-task-status nx-task-status--${selectedTask.status.toLowerCase()} nx-task-detail__status`}>
              {selectedTask.status.replace('_', ' ')}
            </span>

            <div className="nx-task-detail__section">
              <h4 className="nx-task-detail__label">Description</h4>
              <p className="nx-task-detail__text">{selectedTask.description}</p>
            </div>

            <div className="nx-task-detail__section">
              <h4 className="nx-task-detail__label">People</h4>
              <div className="nx-task-detail__people">
                <div className="nx-task-person">
                  <div className="nx-task-person__avatar">{selectedTask.assignee.initials}</div>
                  <span>{selectedTask.assignee.name}</span>
                </div>
                <Icon name="arrow-right" size={16} className="nx-task-detail__arrow" />
                <div className="nx-task-person">
                  <div className="nx-task-person__avatar">{selectedTask.assigner.initials}</div>
                  <span>{selectedTask.assigner.name}</span>
                </div>
              </div>
            </div>

            <div className="nx-task-detail__section">
              <h4 className="nx-task-detail__label">Dates</h4>
              <div className="nx-task-detail__dates">
                <div className="nx-task-date">
                  <Icon name="calendar" size={16} className="nx-task-date__icon" />
                  <div className="nx-task-date__info">
                    <span className="nx-task-date__label">Created</span>
                    <span className="nx-task-date__val">{formatDate(new Date(selectedTask.createdDate))}</span>
                  </div>
                </div>
                <div className="nx-task-date">
                  <Icon name="clock" size={16} className="nx-task-date__icon" />
                  <div className="nx-task-date__info">
                    <span className="nx-task-date__label">Due</span>
                    <span className="nx-task-date__val">
                      {formatDate(new Date(selectedTask.dueDate))}
                      {isOverdue(selectedTask.dueDate) && <span className="nx-task-badge-danger">Overdue</span>}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        )}
      </div>

      {isModalOpen && (
        <CreateTaskModal onClose={() => setIsModalOpen(false)} />
      )}

    </div>
  );
}

function CreateTaskModal({ onClose }) {
  const [priority, setPriority] = useState('Medium');
  const [labels, setLabels] = useState([]);
  const [labelText, setLabelText] = useState('');
  const [suggestedLabels] = useState(['Frontend', 'Backend', 'UI/UX', 'Bug', 'Feature', 'Security']);

  const filteredLabels = suggestedLabels.filter(l => 
    l.toLowerCase().includes(labelText.toLowerCase()) && !labels.includes(l)
  );

  const addLabel = (label) => {
    setLabels([...labels, label]);
    setLabelText('');
  };

  return (
    <div className="nx-modal-overlay" onClick={onClose}>
      <div className="nx-modal-content" onClick={e => e.stopPropagation()}>
        <div className="nx-modal-header">
          <h2 className="nx-modal-title">Create Task</h2>
          <button className="nx-modal-close" onClick={onClose}><Icon name="x" size={20} /></button>
        </div>

        <div className="nx-modal-body">
          {/* Summary / Title */}
          <div className="nx-form-group">
            <label className="nx-form-label">Summary</label>
            <input type="text" className="nx-form-input" placeholder="e.g. Design new login screen" />
          </div>

          <div className="nx-form-row">
            <div className="nx-form-group">
              <label className="nx-form-label">Issue Type</label>
              <select className="nx-form-select">
                <option>Task</option>
                <option>Bug</option>
                <option>Story</option>
                <option>Epic</option>
              </select>
            </div>
            <div className="nx-form-group">
              <label className="nx-form-label">Priority</label>
              <div className="nx-priority-selector">
                {['Urgent', 'High', 'Medium', 'Low'].map(p => (
                  <button 
                    key={p} 
                    className={`nx-priority-btn ${priority === p ? 'active' : ''}`}
                    onClick={() => setPriority(p)}
                    title={p}
                  >
                    <Icon name={`priority-${p.toLowerCase()}`} size={16} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="nx-form-group">
            <label className="nx-form-label">Description</label>
            <textarea className="nx-form-textarea" placeholder="Add more details..."></textarea>
          </div>

          <div className="nx-form-row">
            <div className="nx-form-group">
              <label className="nx-form-label">Assignee</label>
              <select className="nx-form-select">
                <option>Unassigned</option>
                <option>Tristan</option>
                <option>John Doe</option>
              </select>
            </div>
            <div className="nx-form-group">
              <label className="nx-form-label">Reporter</label>
              <select className="nx-form-select">
                <option>Me (Tristan)</option>
                <option>Manager</option>
              </select>
            </div>
          </div>

          <div className="nx-form-group">
            <label className="nx-form-label">Labels</label>
            <div className="nx-label-input-container">
              <div className="nx-labels-pills">
                {labels.map(l => (
                  <span key={l} className="nx-label-pill">
                    {l}
                    <button onClick={() => setLabels(labels.filter(x => x !== l))}><Icon name="x" size={10} /></button>
                  </span>
                ))}
              </div>
              <input 
                type="text" 
                className="nx-label-input" 
                value={labelText}
                onChange={e => setLabelText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && labelText) {
                    addLabel(labelText);
                  }
                }}
                placeholder="Type to search or create..."
              />
              {labelText && (
                <div className="nx-label-suggestions">
                  {filteredLabels.map(l => (
                    <div key={l} className="nx-suggestion-item" onClick={() => addLabel(l)}>{l}</div>
                  ))}
                  {labelText && !suggestedLabels.includes(labelText) && (
                    <div className="nx-suggestion-item nx-suggestion-item--new" onClick={() => addLabel(labelText)}>
                      Create new: <strong>{labelText}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="nx-form-row">
            <div className="nx-form-group">
              <label className="nx-form-label">Due Date {priority === 'Urgent' && <span className="nx-required">*</span>}</label>
              <input type="date" className="nx-form-input" required={priority === 'Urgent'} />
            </div>
          </div>

          <div className="nx-modal-actions-bar">
            <button className="nx-action-btn"><Icon name="paperclip" size={16} /> Attach</button>
            <button className="nx-action-btn"><Icon name="network" size={16} /> Link Issues</button>
          </div>
        </div>

        <div className="nx-modal-footer">
          <button className="nx-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="nx-btn-primary" onClick={onClose}>Create Task</button>
        </div>
      </div>
    </div>
  );
}
