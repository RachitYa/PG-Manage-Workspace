import React, { useState } from 'react';
import TopBar from '../../components/TopBar';
import './DailyTask.css';

const DailyTask = () => {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      date: '19/02/2025',
      issue: 'Washing Machine',
      description: 'Washing Machine is not working. Someone come and checked but it still not working',
      status: 'Pending',
      checked: false
    },
    {
      id: 2,
      date: '19/02/2025',
      issue: 'Washing Machine',
      description: 'Washing Machine is not working. Someone come and checked but it still not working',
      status: 'Complete',
      checked: true
    }
  ]);

  const toggleTask = (id) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        const isNowChecked = !task.checked;
        return { 
          ...task, 
          checked: isNowChecked, 
          status: isNowChecked ? 'Complete' : 'Pending' 
        };
      }
      return task;
    }));
  };

  return (
    <div className="app-container">
      <TopBar title="Daily Task" />
      
      <div className="padding-16 page-content">
        <div className="task-list">
          {tasks.map((task) => (
            <div key={task.id} className="card task-card">
              <div className="task-header">
                <span className="task-date font-semibold">{task.date}</span>
                <input 
                  type="checkbox" 
                  className="task-checkbox" 
                  checked={task.checked}
                  onChange={() => toggleTask(task.id)}
                />
              </div>
              <div className="task-body">
                <div className="task-issue">
                  <span className="font-bold">Issue:</span> {task.issue}
                </div>
                <p className="task-desc text-muted">{task.description}</p>
              </div>
              <div className="task-footer">
                <span className={`status-badge ${task.status === 'Complete' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'}`}>
                  {task.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DailyTask;
