import React, { useEffect, useRef, useState } from 'react';
import { messages, messageRequestId } from '../lib/messages';
import { observations, type PublicBirder } from '../lib/observations';
import { SessionExpiredError } from '../lib/auth';
import { useDialogFocus } from '../lib/useDialogFocus';
import { ScreenType, ChatConversation, Hotspot } from '../types';

interface FieldChatScreenProps {
  hotspots: Hotspot[];
  onOpenHotspot: (id: string) => void;
  onOpenObservation: (id: string) => void;
  onSessionExpired?: () => void;
  onNavigate: (screen: ScreenType) => void;
  showToast: (message: string) => void;
}

export const FieldChatScreen: React.FC<FieldChatScreenProps> = ({
  hotspots,
  onOpenHotspot,
  onOpenObservation,
  onSessionExpired,
}) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [thread, setThread] = useState<ChatConversation | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'gear' | 'okhla'>(
    'all',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [attachment, setAttachment] = useState<{
    observationId?: string;
    hotspotId?: string;
    label: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [picker, setPicker] = useState<
    'people' | 'photo' | 'hotspot' | 'profile' | null
  >(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [people, setPeople] = useState<PublicBirder[]>([]);
  const [photos, setPhotos] = useState<
    Array<{ id: string; label: string; imageUrl: string }>
  >([]);
  const [person, setPerson] = useState<PublicBirder | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const dialog = useDialogFocus(!!picker, () => setPicker(null));
  const controller = useRef<AbortController | null>(null);
  const sending = useRef(false);
  const pages = useRef(1);
  const requestId = useRef<{ payload: string; id: string } | null>(null);
  const activeChat =
    thread?.id === activeChatId
      ? thread
      : conversations.find((c) => c.id === activeChatId);
  const failed = (failure: unknown, signal: AbortSignal) => {
    if (signal.aborted) return;
    if (failure instanceof SessionExpiredError) onSessionExpired?.();
    else
      setError(
        failure instanceof Error
          ? failure.message
          : 'Chat could not be loaded. Please retry.',
      );
  };
  useEffect(() => {
    const request = new AbortController();
    controller.current = request;
    return () => request.abort();
  }, []);
  useEffect(() => {
    pages.current = 1;
    setThread(null);
    setInputMessage('');
    setAttachment(null);
    requestId.current = null;
  }, [activeChatId, searchQuery]);
  useEffect(() => {
    const request = new AbortController();
    let running = false;
    setLoading(true);
    setError('');
    const load = async () => {
      if (running || document.visibilityState === 'hidden') return;
      running = true;
      try {
        if (activeChatId) {
          const result = await messages.thread(activeChatId, request.signal);
          if (request.signal.aborted) return;
          const combined = result.conversation;
          let before = result.nextBefore;
          for (let page = 1; page < pages.current && before !== null; page++) {
            const older = await messages.thread(
              activeChatId,
              request.signal,
              before,
            );
            combined.messages = [
              ...older.conversation.messages,
              ...combined.messages,
            ];
            before = older.nextBefore;
          }
          if (request.signal.aborted) return;
          setThread(combined);
          setNextBefore(before);
          const last = result.conversation.messages.at(-1);
          if (last && result.conversation.unread)
            await messages.read(activeChatId, last.id, request.signal);
        } else {
          const result = await messages.list(request.signal, 0, searchQuery);
          if (request.signal.aborted) return;
          const combined = result.conversations;
          let offset = result.nextOffset;
          for (let page = 1; page < pages.current && offset !== null; page++) {
            const older = await messages.list(
              request.signal,
              offset,
              searchQuery,
            );
            combined.push(...older.conversations);
            offset = older.nextOffset;
          }
          if (request.signal.aborted) return;
          setConversations(combined);
          setNextOffset(offset);
        }
      } catch (failure) {
        failed(failure, request.signal);
      } finally {
        running = false;
        if (!request.signal.aborted) setLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    document.addEventListener('visibilitychange', load);
    return () => {
      request.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [activeChatId, searchQuery, retry]);
  useEffect(() => {
    if (!picker) return;
    const request = new AbortController();
    setPickerLoading(true);
    setError('');
    setPeople([]);
    setPhotos([]);
    setPerson(null);
    const load = async () => {
      try {
        if (picker === 'people') {
          const result = await observations.people(request.signal, pickerQuery);
          if (!request.signal.aborted)
            setPeople(result.filter((p) => !p.isSelf));
        } else if (picker === 'photo' && activeChatId) {
          const result = await messages.shareable(activeChatId, request.signal);
          if (!request.signal.aborted) setPhotos(result.observations);
        } else if (picker === 'profile' && activeChat?.contactId) {
          const result = await observations.person(
            activeChat.contactId,
            request.signal,
          );
          if (!request.signal.aborted) setPerson(result);
        }
      } catch (failure) {
        failed(failure, request.signal);
      } finally {
        if (!request.signal.aborted) setPickerLoading(false);
      }
    };
    void load();
    return () => request.abort();
  }, [picker, pickerQuery, activeChatId]);
  const run = async (action: (signal: AbortSignal) => Promise<void>) => {
    const request = controller.current;
    if (!request || sending.current) return;
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      await action(request.signal);
    } catch (failure) {
      failed(failure, request.signal);
    } finally {
      sending.current = false;
      if (!request.signal.aborted) setBusy(false);
    }
  };
  const handleSendMessage = (quick?: string) => {
    if (quick) setInputMessage(quick);
    const text = (quick ?? inputMessage).trim();
    if (!activeChatId || (!text && !attachment)) return;
    const id = activeChatId,
      body = {
        text,
        ...(attachment?.observationId
          ? { observationId: attachment.observationId }
          : {}),
        ...(attachment?.hotspotId ? { hotspotId: attachment.hotspotId } : {}),
      };
    const payload = JSON.stringify({ id, ...body });
    if (requestId.current?.payload !== payload)
      requestId.current = { payload, id: messageRequestId() };
    const clientId = requestId.current.id;
    void run(async (signal) => {
      const result = await messages.send(id, { ...body, clientId }, signal);
      if (signal.aborted) return;
      setThread((previous) =>
        previous?.id === id
          ? {
              ...previous,
              messages: [
                ...previous.messages.filter((m) => m.id !== result.message.id),
                result.message,
              ],
            }
          : previous,
      );
      setInputMessage('');
      setAttachment(null);
      requestId.current = null;
    });
  };
  const loadMore = () => {
    if (loading || busy) return;
    pages.current++;
    setRetry((n) => n + 1);
  };
  const filteredConversations = conversations.filter(
    (c) => activeFilter === 'all' || c.tags?.includes(activeFilter),
  );

  return (
    <div className="flex flex-col w-full pb-28 pt-1">
      {error && (
        <div role="alert" className="m-4 p-3 rounded-xl bg-orange-50 text-sm">
          {error}{' '}
          <button
            className="min-h-11 underline"
            onClick={() => setRetry((n) => n + 1)}
          >
            Retry loading chat
          </button>
        </div>
      )}
      {loading && (
        <p role="status" className="px-4 text-sm">
          Loading field chat…
        </p>
      )}
      {picker && (
        <div className="fixed inset-0 z-[80] bg-black/40 p-4 flex items-center justify-center">
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-label={
              picker === 'people'
                ? 'Choose a birder'
                : picker === 'photo'
                  ? 'Choose an observation'
                  : picker === 'hotspot'
                    ? 'Choose a public hotspot'
                    : 'Birder profile'
            }
            tabIndex={-1}
            className="bg-white rounded-2xl p-4 w-full max-w-md max-h-[80vh] overflow-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold">
                {picker === 'people'
                  ? 'Choose a birder'
                  : picker === 'photo'
                    ? 'Choose an observation'
                    : picker === 'hotspot'
                      ? 'Choose a public hotspot'
                      : 'Birder profile'}
              </h2>
              <button
                className="min-h-11 min-w-11"
                onClick={() => setPicker(null)}
                aria-label="Close picker"
              >
                ×
              </button>
            </div>
            {pickerLoading && <p role="status">Loading…</p>}
            {error && <p role="alert">{error}</p>}
            {picker === 'people' && (
              <>
                <input
                  aria-label="Search birders"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  maxLength={100}
                  className="border rounded-xl p-3 w-full"
                  placeholder="Search birders by name"
                />
                {people.map((p) => (
                  <button
                    key={p.id}
                    disabled={busy}
                    className="block min-h-11 w-full text-left border-b"
                    onClick={() =>
                      void run(async (signal) => {
                        const result = await messages.open(p.id, signal);
                        if (signal.aborted) return;
                        setConversations((old) => [
                          result.conversation,
                          ...old.filter((c) => c.id !== result.conversation.id),
                        ]);
                        setActiveChatId(result.conversation.id);
                        setPicker(null);
                      })
                    }
                  >
                    {p.name} · {p.handle}
                  </button>
                ))}
                {!pickerLoading && !people.length && (
                  <p>No matching birders.</p>
                )}
              </>
            )}
            {picker === 'photo' && (
              <>
                <p className="text-sm">
                  Only your observations already visible to this recipient can
                  be attached. Change observation privacy explicitly in your
                  journal if needed.
                </p>
                {photos.map((p) => (
                  <button
                    className="block min-h-11 w-full text-left border-b"
                    key={p.id}
                    onClick={() => {
                      setAttachment({ observationId: p.id, label: p.label });
                      setPicker(null);
                    }}
                  >
                    {p.label}
                  </button>
                ))}
                {!pickerLoading && !photos.length && (
                  <p>No eligible observations.</p>
                )}
              </>
            )}
            {picker === 'hotspot' && (
              <>
                {hotspots.map((p) => (
                  <button
                    className="block min-h-11 w-full text-left border-b"
                    key={p.id}
                    onClick={() => {
                      setAttachment({ hotspotId: p.id, label: p.name });
                      setPicker(null);
                    }}
                  >
                    {p.name}
                  </button>
                ))}
                {!hotspots.length && <p>Load discovery hotspots first.</p>}
              </>
            )}
            {picker === 'profile' && person && (
              <div className="space-y-2">
                <p>
                  {person.name} · {person.handle}
                </p>
                <p>{person.bio || 'No biography added.'}</p>
                <p>
                  {person.photosCount} visible photographs · {person.birdsCount}{' '}
                  species · {person.followersCount} followers
                </p>
                <p>{person.primaryRig || 'Camera details unavailable'}</p>
              </div>
            )}
          </div>
        </div>
      )}
      {!activeChatId ? (
        /* CONVERSATION LIST VIEW */
        <section className="flex flex-col w-full px-4 py-2 space-y-3">
          {/* Search & New Chat Action Card */}
          <div className="flex items-center justify-between gap-2 bg-[#ebeef3] rounded-2xl p-1.5 shadow-xs">
            <div className="flex items-center gap-2 flex-1 bg-white rounded-xl px-3 py-2 shadow-xs">
              <span className="material-symbols-outlined text-[18px] text-[#72796e]">
                search
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search field notes & birders..."
                className="w-full bg-transparent text-[13px] text-[#181c20] placeholder:text-[#72796e] focus:outline-none"
              />
            </div>
            <button
              onClick={() => {
                setPickerQuery('');
                setPicker('people');
              }}
              aria-label="Start new field chat"
              className="min-w-11 min-h-11 flex items-center justify-center rounded-xl bg-[#154212] text-white shadow-xs hover:bg-[#2d5a27] active:scale-95 transition-all flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">
                edit_square
              </span>
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
              <span className="text-[10px] bg-[#e0e3e8] px-1 rounded">
                {conversations.filter((c) => c.tags?.includes('okhla')).length}
              </span>
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
            {!loading && !filteredConversations.length && (
              <p className="p-4 text-sm">
                No matching conversations. Start a new chat with a birder.
              </p>
            )}
            {filteredConversations.map((conv) => (
              <button
                type="button"
                key={conv.id}
                onClick={() => {
                  setActiveChatId(conv.id);
                }}
                className="flex items-start gap-3 p-3.5 bg-white rounded-2xl shadow-xs hover:bg-[#f1f4f9] active:bg-[#ebeef3] transition-all cursor-pointer relative text-left border border-[#f1f4f9]"
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
              </button>
            ))}
          </div>

          {nextOffset !== null && (
            <button
              disabled={busy || loading}
              className="min-h-11 underline"
              onClick={loadMore}
            >
              Load more conversations
            </button>
          )}
          {/* Thoughtful Naturalist Journal Footer Note */}
          <div className="flex items-center gap-3 p-3.5 bg-[#f1f4f9] rounded-2xl">
            <div className="min-w-11 min-h-11 rounded-lg bg-[#e0e3e8] flex items-center justify-center text-[#20402b] flex-shrink-0">
              <span className="material-symbols-outlined text-[18px]">
                nature_people
              </span>
            </div>
            <p className="text-[12px] text-[#42493e] leading-snug">
              Messages are stored for participants. Photo access follows
              observation privacy. Attach public hotspots explicitly; precise
              GPS is never attached automatically.
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
                disabled={busy}
                onClick={() => setActiveChatId(null)}
                aria-label="Back to conversations"
                className="min-w-11 min-h-11 flex items-center justify-center rounded-xl bg-[#ebeef3] text-[#181c20] hover:bg-[#e0e3e8] active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">
                  arrow_back
                </span>
              </button>

              <div className="relative flex-shrink-0">
                <img
                  src={activeChat?.contactAvatar}
                  alt={activeChat?.contactName}
                  className="min-w-11 min-h-11 rounded-xl object-cover"
                />
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-bold text-[#181c20] truncate">
                    {activeChat?.contactName}
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
                onClick={() => setPicker('profile')}
                aria-label="View birder observation card"
                className="min-w-11 min-h-11 flex items-center justify-center rounded-lg text-[#42493e] hover:bg-[#ebeef3]"
              >
                <span className="material-symbols-outlined text-[18px]">
                  person_pin_circle
                </span>
              </button>
            </div>
          </div>

          {/* Active Field Context Strip */}
          <div className="px-4 py-1.5 bg-[#f1f4f9] flex items-center justify-between text-[#42493e] text-[11px] border-b border-[#e0e3e8]">
            <span className="flex items-center gap-1 truncate">
              <span className="material-symbols-outlined text-[13px] text-[#20402b]">
                pin_drop
              </span>
              {activeChat?.contextLocation}
            </span>
            <span className="text-[#72796e] flex-shrink-0">
              {activeChat?.contextLifeNumber}
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex flex-col space-y-3 px-4 py-4 min-h-[360px]">
            <div className="flex items-center justify-center my-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#ebeef3] text-[#42493e] text-[10px] font-bold tracking-wide uppercase">
                Stored field messages · India time
              </span>
            </div>

            {nextBefore !== null && (
              <button
                disabled={busy || loading}
                className="min-h-11 underline"
                onClick={loadMore}
              >
                Load older messages
              </button>
            )}
            {!loading && !activeChat?.messages.length && (
              <p>No messages yet. Start with a field note.</p>
            )}
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
                    <span className="text-[10px] text-[#72796e]">
                      {msg.time}
                    </span>
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
                    <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {msg.text}
                    </span>
                    {msg.attachment &&
                      (msg.attachment.unavailable ? (
                        <p>{msg.attachment.label}</p>
                      ) : (
                        <button
                          type="button"
                          className="block min-h-11 text-left underline"
                          onClick={() => {
                            const item = msg.attachment!;
                            if (item.id)
                              (item.kind === 'hotspot'
                                ? onOpenHotspot
                                : onOpenObservation)(item.id);
                          }}
                        >
                          {msg.attachment.imageUrl && (
                            <img
                              src={msg.attachment.imageUrl}
                              alt="Shared observation"
                              className="w-32 h-24 rounded-lg object-cover"
                              onError={(e) => {
                                e.currentTarget.hidden = true;
                              }}
                            />
                          )}
                          {msg.attachment.label}
                        </button>
                      ))}
                  </div>

                  {isMe && (
                    <div className="flex items-center gap-1 pr-1 text-[10px] text-[#72796e]">
                      <span>Stored on server</span>
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
            {attachment && (
              <div className="flex items-center justify-between text-sm">
                {attachment.label}
                <button
                  disabled={busy}
                  className="min-h-11"
                  onClick={() => setAttachment(null)}
                >
                  Remove attachment
                </button>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-[#f1f4f9] rounded-2xl p-1.5 shadow-inner">
              <button
                type="button"
                disabled={busy || loading}
                onClick={() => setPicker('photo')}
                aria-label="Attach field photo"
                className="min-w-11 min-h-11 flex items-center justify-center rounded-xl text-[#42493e] hover:bg-[#ebeef3]"
              >
                <span className="material-symbols-outlined text-[20px] text-[#20402b]">
                  add_a_photo
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!busy && !loading) setPicker('hotspot');
                }}
                aria-label="Share public hotspot"
                className="min-w-11 min-h-11 flex items-center justify-center rounded-lg text-[#72796e] hover:text-[#181c20]"
              >
                <span className="material-symbols-outlined text-[18px]">
                  share_location
                </span>
              </button>

              <input
                disabled={busy}
                maxLength={2000}
                aria-label="Message text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
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
                disabled={
                  busy || loading || (!inputMessage.trim() && !attachment)
                }
                aria-label="Send message"
                className="min-w-11 min-h-11 flex items-center justify-center rounded-full bg-[#2d5a27] text-white shadow-xs hover:opacity-90 active:scale-95 transition-all flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">
                  send
                </span>
              </button>
            </div>

            {/* Micro Quick Replies */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 px-1">
              <button
                type="button"
                onClick={() => handleSendMessage('What time works best?')}
                disabled={busy || loading}
                className="min-h-11 px-2.5 py-1 rounded-full bg-[#ebeef3] text-[#181c20] text-[11px] font-medium whitespace-nowrap hover:bg-[#e0e3e8]"
              >
                “What time works best?”
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSendMessage('What access arrangements should we check?')
                }
                disabled={busy || loading}
                className="min-h-11 px-2.5 py-1 rounded-full bg-[#ebeef3] text-[#181c20] text-[11px] font-medium whitespace-nowrap hover:bg-[#e0e3e8]"
              >
                “What access should we check?”
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Count me in!')}
                disabled={busy || loading}
                className="min-h-11 px-2.5 py-1 rounded-full bg-[#ebeef3] text-[#181c20] text-[11px] font-medium whitespace-nowrap hover:bg-[#e0e3e8]"
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
