import { useState, useEffect } from 'react';

export function useClock() {
  const [now, setNow] = useState(new Date());
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [clockOutTime, setClockOutTime] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const clockIn = () => {
    setClockInTime(new Date());
    setClockedIn(true);
    setClockOutTime(null);
  };

  const clockOut = () => {
    setClockOutTime(new Date());
    setClockedIn(false);
  };

  return { now, clockedIn, clockInTime, clockOutTime, clockIn, clockOut };
}
