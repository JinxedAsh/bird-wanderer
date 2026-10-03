import React, { useState } from 'react';
import { AppNotification, ScreenType } from '../types';

interface NotificationsScreenProps {
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onSelectNotification: (notif: AppNotification) => void;
  onNavigate: (screen: ScreenType) => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  notifications,
  onMarkAllRead,
  onSelectNotification,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'mentions' | 'alerts'>('all');

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'all') return true;
    return n.category === activeTab;
  });

  return (
    <div className="flex flex-col w-full pb-28 pt-1">
      {/* Content Header & Action Bar */}
      <section className="px-4 pt-2 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[18px] font-bold text-[#181c20]">Notifications</span>
          <span
            className={`font-semibold text-[11px] px-2 py-0.5 rounded-full ${
              unreadCount > 0
                ? 'bg-[#2d5a27] text-white'
                : 'bg-[#ebeef3] text-[#42493e]'
            }`}
          >
            {unreadCount > 0 ? `${unreadCount} new` : '0 new'}
          </span>
        </div>

        <button
          onClick={onMarkAllRead}
          className="text-[13px] font-semibold text-[#154212] hover:text-[#2d5a27] transition-colors py-1 px-1 focus:outline-none"
        >
          Mark all read
        </button>
      </section>

      {/* Filter Tabs */}
      <nav aria-label="Notification filters" className="px-4 pb-3">
        <div className="flex items-center gap-1.5 bg-[#f1f4f9] p-1 rounded-xl">
          {(['all', 'mentions', 'alerts'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-[13px] text-center capitalize transition-all ${
                  isActive
                    ? 'bg-white text-[#154212] font-bold shadow-xs'
                    : 'text-[#42493e] hover:text-[#181c20]'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Notification Feed */}
      <div className="flex flex-col px-4 gap-2.5">
        {filteredNotifications.map((notif) => (
          <article
            key={notif.id}
            onClick={() => onSelectNotification(notif)}
            className={`relative flex items-start gap-3 p-3.5 rounded-2xl shadow-xs transition-all cursor-pointer border ${
              notif.isUnread
                ? 'bg-white border-[#f1f4f9]'
                : 'bg-white/60 hover:bg-white border-transparent'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5 relative">
              <div
                className={`w-10 h-10 rounded-full ${notif.iconBg} flex items-center justify-center ${notif.iconColor}`}
              >
                <span className="material-symbols-outlined text-[20px]">{notif.icon}</span>
              </div>
            </div>

            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-baseline justify-between gap-1 mb-0.5">
                <h2 className="text-[13px] font-bold text-[#181c20] truncate">{notif.title}</h2>
                <time className="text-[11px] text-[#72796e] flex-shrink-0">{notif.timeAgo}</time>
              </div>

              <p className="text-[12px] text-[#42493e] line-clamp-2 leading-relaxed">
                {notif.description}
              </p>
            </div>

            {notif.thumbnail && (
              <div className="flex-shrink-0 relative">
                <img
                  src={notif.thumbnail}
                  alt="Thumb"
                  className="w-11 h-11 rounded-lg object-cover bg-[#ebeef3]"
                />
              </div>
            )}

            {notif.isUnread && (
              <div className="absolute right-3.5 top-5 w-2 h-2 rounded-full bg-[#fe932c]"></div>
            )}
          </article>
        ))}

        {filteredNotifications.length === 0 && (
          <div className="py-14 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#f1f4f9] flex items-center justify-center text-[#72796e] mb-3">
              <span className="material-symbols-outlined text-[28px]">notifications_paused</span>
            </div>
            <p className="text-[16px] font-bold text-[#181c20] mb-1">All quiet in the field</p>
            <p className="text-[12px] text-[#42493e] max-w-xs">
              No pending notifications in this category. Keep exploring and observing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
