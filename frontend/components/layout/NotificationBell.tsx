'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGetWithMeta, apiPost } from '@/lib/api';
import type { NotificationItem } from '@/lib/types';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    apiGetWithMeta<NotificationItem[]>('/api/v1/notifications')
      .then(({ data, meta }) => {
        setItems(data);
        setUnreadCount(typeof meta.unreadCount === 'number' ? meta.unreadCount : 0);
      })
      .catch(() => {});
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  function toggleOpen() {
    setOpen((prev) => {
      if (!prev) load();
      return !prev;
    });
  }

  async function handleClickItem(item: NotificationItem) {
    if (!item.read) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, read: true } : i)));
      setUnreadCount((c) => Math.max(0, c - 1));
      apiPost(`/api/v1/notifications/${item.id}/read`, {}).catch(() => {});
    }
    setOpen(false);
    if (item.link) router.push(item.link);
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnreadCount(0);
    apiPost('/api/v1/notifications/read-all', {}).catch(() => {});
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="relative rounded-xl p-2 text-slate-300 transition-colors duration-200 hover:bg-white/10 hover:text-white"
        title="Thông báo"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[200] mt-2 w-80 rounded-2xl border border-white/20 bg-slate-950/60 p-2 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm font-semibold text-white">Thông báo</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
              >
                Đánh dấu đã đọc hết
              </button>
            )}
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-slate-400">Chưa có thông báo nào.</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleClickItem(item)}
                  className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition-colors duration-150 ${
                    item.read
                      ? 'text-slate-400 hover:bg-white/10'
                      : 'border border-indigo-400/30 bg-indigo-500/15 text-white hover:bg-indigo-500/20'
                  }`}
                >
                  <p className="line-clamp-3">{item.message}</p>
                  <p className="mt-1 text-xs text-slate-500">{timeAgo(item.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
