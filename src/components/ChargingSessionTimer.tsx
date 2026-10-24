import React, { useEffect, useState } from 'react';

export const ChargingSessionTimer: React.FC<{ startedAt: number }> = ({ startedAt }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const formatted = [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');

  return (
    <div role="timer" aria-label={`Charging session elapsed time ${formatted}`} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800">Charging timer</p>
      <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-emerald-950">{formatted}</p>
      <p className="text-[10px] text-emerald-800">Started {new Date(startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  );
};
