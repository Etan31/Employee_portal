import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { logError } from "../utils/logger.js";

/**
 * App-wide mutable data shared across pages: notifications (bell + settings),
 * tasks (TaskBox create), leave requests (TimeManagement form + Dashboard count).
 * Read-only page data stays in per-page useAsyncData calls.
 */
const AppDataContext = createContext(null);

export const AppDataProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      import("../data/notifications.js"),
      import("../data/tasks.js"),
      import("../data/timeManagement.js"),
    ])
      .then(([notif, taskMod, tm]) => {
        if (!active) return;
        setNotifications(notif.NOTIFICATIONS);
        setTasks(taskMod.TASKS);
        setLeaveRequests(tm.LEAVE_REQUESTS);
        setReady(true);
      })
      .catch((error) => {
        logError("App data seed failed:", error);
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, []);

  const addTask = useCallback((task) => {
    setTasks((prev) => [task, ...prev]);
  }, []);

  const addLeaveRequest = useCallback((request) => {
    setLeaveRequests((prev) => [request, ...prev]);
  }, []);

  return (
    <AppDataContext.Provider
      value={{
        ready,
        notifications,
        unreadCount: notifications.filter((n) => !n.is_read).length,
        markNotificationRead,
        markAllNotificationsRead,
        tasks,
        addTask,
        leaveRequests,
        addLeaveRequest,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return context;
};
