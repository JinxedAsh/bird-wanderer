import React, { useState } from 'react';
import { CHAT_CONVERSATIONS } from '../data/mockData';
import { ScreenType, ChatConversation, ChatMessage } from '../types';

interface FieldChatScreenProps {
  onNavigate: (screen: ScreenType) => void;
  showToast: (message: string) => void;
}

export const FieldChatScreen: React.FC<FieldChatScreenProps> = ({ onNavigate, showToast }) => {
  const [conversations, setConversations] = useState<ChatConversation[]>(CHAT_CONVERSATIONS);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'okhla' | 'gear'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputMessage, setInputMessage] = useState('');

  const activeChat = conversations.find((c) => c.id === activeChatId);

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputMessage.trim();
    if (!text || !activeChatId) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'me',
      senderName: 'You',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      delivered: true,
    };

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === activeChatId) {
          return {
            ...conv,
            lastMessage: `"${text}"`,
            timeAgo: 'Just now',
            messages: [...conv.messages, newMsg],
          };
        }
        return conv;
      })
    );

    setInputMessage('');

    // Simulate natural naturalist reply
    setTimeout(() => {
      const replyMsg: ChatMessage = {
        id: `reply-${Date.now()}`,
        sender: 'other',
        senderName: activeChat?.contactName.split(' ')[0] || 'Birder',
        text: 'Noted! I will adjust my field focal length and see you on the trail.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === activeChatId) {
            return {
              ...conv,
              messages: [...conv.messages, replyMsg],
            };
          }
          return conv;
        })
      );
    }, 1200);
  };

  const filteredConversations = conversations.filter((c) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.contactName.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q) ||
        (c.topic || '').toLowerCase().includes(q)
      );
    }
    if (activeFilter === 'okhla') {
      return (c.topic || '').toLowerCase().includes('okhla');
    }
    if (activeFilter === 'gear') {
      return (c.topic || '').toLowerCase().includes('sony') || (c.topic || '').toLowerCase().includes('lens');
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full pb-28 pt-1">
      {!activeChatId ? (
        /* CONVERSATION LIST VIEW */
        <section className="flex flex-col w-full px-4 py-2 space-y-3">
          {/* Search & New Chat Action Card */}
          <div className="flex items-center justify-between gap-2 bg-[#ebeef3] rounded-2xl p-1.5 shadow-xs">
            <div className="flex items-center gap-2 flex-1 bg-white rounded-xl px-3 py-2 shadow-xs">
              <span className="material-symbols-outlined text-[18px] text-[#72796e]">search</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search field notes & birders..."
                className="w-full bg-transparent text-[13px] text-[#181c20] placeholder:text-[#72796e] focus:outline-none"
              />
            </div>
            <button
              onClick={() => {
                setActiveChatId('maya');
                showToast('Started chat with Maya Singh');
              }}
              aria-label="Start new field chat"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#154212] text-white shadow-xs hover:bg-[#2d5a27] active:scale-95 transition-all flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">edit_square</span>
            </button>
          </div>

          {/* Active Status Pill Filter */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-1.5 rounded-full font-semibold text-[12px] flex items-center gap-1.5 flex-shrink-0 transition-all ${
                activeFilter === 'all'
                  ? 'bg-[#2d5a27] text-white shadow-xs'
                  : 'bg-[#ebeef3] text-[#42493e]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#a1d494] animate-pulse"></span>
              All Field Chats
            </button>
            <button
              onClick={() => setActiveFilter('okhla')}
              className={`px-3.5 py-1.5 rounded-full font-semibold text-[12px] flex items-center gap-1 flex-shrink-0 transition-all ${
                activeFilter === 'okhla'
                  ? 'bg-[#2d5a27] text-white shadow-xs'
                  : 'bg-[#ebeef3] text-[#42493e]'
              }`}
            >
              <span>Okhla Hotspot</span>
              <span className="text-[10px] bg-[#e0e3e8] px-1 rounded">2</span>
            </button>
            <button
              onClick={() => setActiveFilter('gear')}
              className={`px-3.5 py-1.5 rounded-full font-semibold text-[12px] flex items-center gap-1 flex-shrink-0 transition-all ${
                activeFilter === 'gear'
                  ? 'bg-[#2d5a27] text-white shadow-xs'
                  : 'bg-[#ebeef3] text-[#42493e]'
              }`}
            >
              <span>Gear Discussions</span>
            </button>
          </div>

          {/* Conversations Stack */}
          <div className="flex flex-col space-y-2.5">
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => {
                  setActiveChatId(conv.id);
                  // Mark as read
                  setConversations((prev) =>
                    prev.map((c) => (c.id === conv.id ? { ...c, unread: false } : c))
                  );
                }}
                className="flex items-start gap-3 p-3.5 bg-white rounded-2xl shadow-xs hover:bg-[#f1f4f9] active:bg-[#ebeef3] transition-all cursor-pointer relative border border-[#f1f4f9]"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={conv.contactAvatar}
                    alt={conv.contactName}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                  {conv.badge && (
                    <span
                      className="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-[#fe932c] text-white shadow-xs"
                      title="Top Birder Badge"
                    >
                      <span
                        className="material-symbols-outlined text-[12px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        workspace_premium
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[14px] font-bold text-[#181c20] truncate">
                        {conv.contactName}
                      </span>
                      {conv.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-[#ffdcc3] text-[#6e3900] text-[9px] font-bold uppercase tracking-wider flex-shrink-0">
                          {conv.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#904d00] font-semibold flex-shrink-0">
                      {conv.timeAgo}
                    </span>
                  </div>

                  <p className="text-[13px] text-[#181c20] font-medium line-clamp-1">
                    {conv.lastMessage}
                  </p>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#42493e]">
                      <span className="material-symbols-outlined text-[13px] text-[#154212]">
                        photo_camera
                      </span>
                      {conv.topic}
                    </span>
                  </div>
                </div>

                {conv.unread && (
                  <div className="flex items-center self-center pl-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#fe932c] ring-2 ring-white"></span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Thoughtful Naturalist Journal Footer Note */}
          <div className="flex items-center gap-3 p-3.5 bg-[#f1f4f9] rounded-2xl">
            <div className="w-8 h-8 rounded-lg bg-[#e0e3e8] flex items-center justify-center text-[#20402b] flex-shrink-0">
              <span className="material-symbols-outlined text-[18px]">nature_people</span>
            </div>
            <p className="text-[12px] text-[#42493e] leading-snug">
              Conversations are geo-tagged to your regional life-list logbook for easy hotspot
              referencing.
            </p>
          </div>
        </section>
      ) : (
        /* ACTIVE INTERACTIVE CHAT INTERFACE OVERLAY */
        <section className="flex flex-col w-full bg-[#f7f9ff]">
          {/* Header Sub-bar */}
          <div className="sticky top-16 z-30 flex items-center justify-between px-4 py-2.5 bg-white border-b border-[#f1f4f9] shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => setActiveChatId(null)}
                aria-label="Back to conversations"
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#ebeef3] text-[#181c20] hover:bg-[#e0e3e8] active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>

              <div className="relative flex-shrink-0">
                <img
                  src={activeChat?.contactAvatar}
                  alt={activeChat?.contactName}
                  className="w-9 h-9 rounded-xl object-cover"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#a1d494] ring-1 ring-white"></span>
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-bold text-[#181c20] truncate">
                    {activeChat?.contactName}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-[#ffdcc3] text-[#6e3900] text-[9px] font-bold">
                    PRO
                  </span>
                </div>
                <span className="text-[11px] text-[#42493e] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3b6934]"></span>
                  {activeChat?.status}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => showToast(`Viewing observation logbook for ${activeChat?.contactName}`)}
                aria-label="View birder observation card"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#42493e] hover:bg-[#ebeef3]"
              >
                <span className="material-symbols-outlined text-[18px]">person_pin_circle</span>
              </button>
            </div>
          </div>

          {/* Active Field Context Strip */}
          <div className="px-4 py-1.5 bg-[#f1f4f9] flex items-center justify-between text-[#42493e] text-[11px] border-b border-[#e0e3e8]">
            <span className="flex items-center gap-1 truncate">
              <span className="material-symbols-outlined text-[13px] text-[#20402b]">pin_drop</span>
              {activeChat?.contextLocation}
            </span>
            <span className="text-[#72796e] flex-shrink-0">{activeChat?.contextLifeNumber}</span>
          </div>

          {/* Messages Stream */}
          <div className="flex flex-col space-y-3 px-4 py-4 min-h-[360px]">
            <div className="flex items-center justify-center my-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#ebeef3] text-[#42493e] text-[10px] font-bold tracking-wide uppercase">
                Today • Field Session
              </span>
            </div>

            {activeChat?.messages.map((msg) => {
              const isMe = msg.sender === 'me';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] space-y-1 ${
                    isMe ? 'self-end items-end' : 'self-start items-start'
                  }`}
                >
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="text-[10px] text-[#72796e]">{msg.time}</span>
                    <span
                      className={`text-[10px] font-semibold ${
                        isMe ? 'text-[#154212]' : 'text-[#42493e]'
                      }`}
                    >
                      {msg.senderName}
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-2xl text-[13px] leading-relaxed shadow-xs ${
                      isMe
                        ? 'bg-[#2d5a27] text-white rounded-tr-xs'
                        : 'bg-white text-[#181c20] rounded-tl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {isMe && (
                    <div className="flex items-center gap-1 pr-1 text-[10px] text-[#72796e]">
                      <span>Delivered</span>
                      <span className="material-symbols-outlined text-[13px] text-[#3b6934]">
                        done_all
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sticky Field Composer */}
          <div className="sticky bottom-0 z-30 p-2.5 bg-white border-t border-[#f1f4f9] shadow-lg">
            <div className="flex items-center gap-1.5 bg-[#f1f4f9] rounded-2xl p-1.5 shadow-inner">
              <button
                type="button"
                onClick={() => showToast('Photo picker ready')}
                aria-label="Attach field photo"
                className="w-9 h-9 flex items-center justify-center rounded-xl text-[#42493e] hover:bg-[#ebeef3]"
              >
                <span className="material-symbols-outlined text-[20px] text-[#20402b]">
                  add_a_photo
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInputMessage('28.5670° N, 77.3110° E (Okhla Watchtower perches)');
                  showToast('Attached GPS Coordinates');
                }}
                aria-label="Share GPS coordinates"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#72796e] hover:text-[#181c20]"
              >
                <span className="material-symbols-outlined text-[18px]">share_location</span>
              </button>

              <input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Write a message..."
                className="flex-1 min-w-0 bg-transparent py-1.5 px-2 text-[13px] text-[#181c20] placeholder:text-[#72796e] focus:outline-none"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                aria-label="Send message"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#2d5a27] text-white shadow-xs hover:opacity-90 active:scale-95 transition-all flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </div>

            {/* Micro Quick Replies */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 px-1">
              <button
                type="button"
                onClick={() => handleSendMessage('What time works best?')}
                className="px-2.5 py-1 rounded-full bg-[#ebeef3] text-[#181c20] text-[11px] font-medium whitespace-nowrap hover:bg-[#e0e3e8]"
              >
                “What time works best?”
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Light is best near the northern hide.')}
                className="px-2.5 py-1 rounded-full bg-[#ebeef3] text-[#181c20] text-[11px] font-medium whitespace-nowrap hover:bg-[#e0e3e8]"
              >
                “Northern hide light is best”
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Count me in!')}
                className="px-2.5 py-1 rounded-full bg-[#ebeef3] text-[#181c20] text-[11px] font-medium whitespace-nowrap hover:bg-[#e0e3e8]"
              >
                “Count me in!”
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
