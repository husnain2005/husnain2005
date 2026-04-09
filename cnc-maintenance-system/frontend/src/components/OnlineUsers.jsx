import React, { useState, useEffect } from 'react';
import api from '../services/api';

// Palette di colori per gli avatar (assegnati per userId)
const COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-amber-500', 'bg-cyan-500',
];

function getColor(userId) {
  return COLORS[userId % COLORS.length];
}

function formatDuration(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return 'adesso';
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getInitials(fullName, username) {
  if (fullName) {
    const parts = fullName.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : fullName.substring(0, 2).toUpperCase();
  }
  return (username || '?').substring(0, 2).toUpperCase();
}

export default function OnlineUsers({ currentUserId }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchOnline = async () => {
      try {
        const res = await api.get('/presence/online');
        setUsers(res.data.users || []);
      } catch {
        // silenzioso: non critico
      }
    };

    fetchOnline();
    const id = setInterval(fetchOnline, 30 * 1000);
    return () => clearInterval(id);
  }, []);

  if (users.length === 0) return null;

  return (
    <div className="px-4 py-3 border-b border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Online ora
        </span>
        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          {users.length}
        </span>
      </div>
      <div className="space-y-1">
        {users.map(u => (
          <div key={u.userId} className="flex items-center gap-2.5 group">
            {/* Avatar con dot verde */}
            <div className="relative flex-shrink-0">
              <div className={`w-7 h-7 rounded-full ${getColor(u.userId)} flex items-center justify-center`}>
                <span className="text-white text-xs font-bold">
                  {getInitials(u.fullName, u.username)}
                </span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
            </div>

            {/* Nome e durata */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-gray-700 truncate">
                  {u.fullName || u.username}
                  {u.userId === currentUserId && (
                    <span className="text-gray-400 font-normal"> (tu)</span>
                  )}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {formatDuration(u.onlineForMs)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
