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

export function TaskBox() {
  const [filter, setFilter] = useState('assigned');
  
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
    <div className="nx-card nx-taskbox">
      
      {/* Left Pane - List */}
      <div className="nx-taskbox__list-pane">
        <div className="nx-taskbox__filter-bar">
          <Dropdown options={filterOptions} value={filter} onChange={setFilter} />
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

    </div>
  );
}
