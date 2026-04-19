"use client";

import { useEffect, useState } from "react";

export function useLocalTime(tickIntervalMs = 1000) {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());

    const timer = window.setInterval(() => {
      setTime(new Date());
    }, tickIntervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [tickIntervalMs]);

  return time;
}
