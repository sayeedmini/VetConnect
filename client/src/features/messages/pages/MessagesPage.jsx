import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SiteLayout from '../../../components/SiteLayout';
import { formatFriendlyDate } from '../../../utils/date';
import { getUser } from '../../auth/utils/auth';
import {
  getConversationByAppointment,
  getMyConversations,
  sendMessage,
} from '../services/messageApi';
import { getMessageSocket } from '../services/messageSocket';

const formatMessageTime = (value) =>
  new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

function MessagesPage() {
  const currentUser = getUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeAppointmentId, setActiveAppointmentId] = useState(
    searchParams.get('appointment') || ''
  );
  const [conversation, setConversation] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const messageEndRef = useRef(null);
  const joinedAppointmentRef = useRef('');
  const activeAppointmentRef = useRef(activeAppointmentId);

  const loadConversationList = async (preferredAppointmentId = '', options = {}) => {
    if (!options.silent) {
      setLoadingList(true);
    }

    try {
      const response = await getMyConversations();
      const nextConversations = response.data || [];
      setConversations(nextConversations);

      const existingTarget = nextConversations.find(
        (item) => item.appointment?._id === preferredAppointmentId
      );
      const nextActiveId =
        preferredAppointmentId && existingTarget
          ? preferredAppointmentId
          : nextConversations[0]?.appointment?._id || '';

      setActiveAppointmentId(nextActiveId);
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to load conversations');
      console.error(error);
    } finally {
      if (!options.silent) {
        setLoadingList(false);
      }
    }
  };

  const loadConversation = async (appointmentId, options = {}) => {
    if (!appointmentId) {
      setConversation(null);
      return;
    }

    if (!options.silent) {
      setLoadingConversation(true);
    }

    try {
      const response = await getConversationByAppointment(appointmentId);
      setConversation(response.data || null);
      setConversations((current) =>
        current.map((item) =>
          item.appointment?._id === appointmentId
            ? { ...item, unreadCount: 0 }
            : item
        )
      );
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to load conversation');
      console.error(error);
    } finally {
      if (!options.silent) {
        setLoadingConversation(false);
      }
    }
  };

  const refreshConversationList = useEffectEvent((preferredAppointmentId = '') => {
    loadConversationList(preferredAppointmentId, { silent: true });
  });

  const refreshConversation = useEffectEvent((appointmentId) => {
    loadConversation(appointmentId, { silent: true });
  });

  useEffect(() => {
    activeAppointmentRef.current = activeAppointmentId;
  }, [activeAppointmentId]);

  useEffect(() => {
    const appointmentIdFromQuery = searchParams.get('appointment') || '';
    loadConversationList(appointmentIdFromQuery);
  }, [searchParams]);

  useEffect(() => {
    if (!activeAppointmentId) {
      return;
    }

    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('appointment', activeAppointmentId);
      return next;
    });
  }, [activeAppointmentId, setSearchParams]);

  useEffect(() => {
    loadConversation(activeAppointmentId);
  }, [activeAppointmentId]);

  useEffect(() => {
    const socket = getMessageSocket();

    if (socket) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      refreshConversationList(activeAppointmentRef.current);

      if (activeAppointmentRef.current) {
        refreshConversation(activeAppointmentRef.current);
      }
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshConversation, refreshConversationList]);

  useEffect(() => {
    const socket = getMessageSocket();

    if (!socket) {
      return undefined;
    }

    const joinCurrentConversation = () => {
      const currentAppointmentId = activeAppointmentRef.current;

      if (!currentAppointmentId) {
        return;
      }

      socket.emit('conversation:join', {
        appointmentId: currentAppointmentId,
      });
      joinedAppointmentRef.current = currentAppointmentId;
    };

    const handleMessageNew = ({ appointmentId }) => {
      refreshConversationList(activeAppointmentRef.current);

      if (appointmentId === activeAppointmentRef.current) {
        refreshConversation(appointmentId);
      }
    };

    const handleConversationsRefresh = ({ appointmentId }) => {
      refreshConversationList(activeAppointmentRef.current);

      if (appointmentId === activeAppointmentRef.current) {
        refreshConversation(appointmentId);
      }
    };

    const handleConversationRead = ({ appointmentId }) => {
      refreshConversationList(activeAppointmentRef.current);

      if (appointmentId === activeAppointmentRef.current) {
        refreshConversation(appointmentId);
      }
    };

    socket.on('connect', joinCurrentConversation);
    socket.on('message:new', handleMessageNew);
    socket.on('conversations:refresh', handleConversationsRefresh);
    socket.on('conversation:refresh', handleConversationsRefresh);
    socket.on('conversation:read', handleConversationRead);

    if (!socket.connected) {
      socket.connect();
    } else {
      joinCurrentConversation();
    }

    return () => {
      if (joinedAppointmentRef.current) {
        socket.emit('conversation:leave', {
          appointmentId: joinedAppointmentRef.current,
        });
        joinedAppointmentRef.current = '';
      }

      socket.off('connect', joinCurrentConversation);
      socket.off('message:new', handleMessageNew);
      socket.off('conversations:refresh', handleConversationsRefresh);
      socket.off('conversation:refresh', handleConversationsRefresh);
      socket.off('conversation:read', handleConversationRead);
      socket.disconnect();
    };
  }, [refreshConversation, refreshConversationList]);

  useEffect(() => {
    const socket = getMessageSocket();
    const previousAppointmentId = joinedAppointmentRef.current;

    if (!socket || !socket.connected) {
      return;
    }

    if (previousAppointmentId && previousAppointmentId !== activeAppointmentId) {
      socket.emit('conversation:leave', {
        appointmentId: previousAppointmentId,
      });
    }

    if (!activeAppointmentId) {
      joinedAppointmentRef.current = '';
      return;
    }

    socket.emit('conversation:join', {
      appointmentId: activeAppointmentId,
    });
    joinedAppointmentRef.current = activeAppointmentId;
  }, [activeAppointmentId]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages?.length]);

  const activeSummary = useMemo(
    () =>
      conversations.find((item) => item.appointment?._id === activeAppointmentId) || null,
    [activeAppointmentId, conversations]
  );

  const handleSelectConversation = (appointmentId) => {
    setActiveAppointmentId(appointmentId);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const trimmedDraft = draft.trim();

    if (!trimmedDraft || !activeAppointmentId) {
      return;
    }

    setSending(true);
    try {
      await sendMessage(activeAppointmentId, { content: trimmedDraft });
      setDraft('');
      refreshConversation(activeAppointmentId);
      refreshConversationList(activeAppointmentId);
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to send message');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  return (
    <SiteLayout
      eyebrow="Private messaging"
      title={currentUser?.role === 'vet' ? 'Message pet owners' : 'Message your vet'}
      subtitle="Each conversation is attached to an appointment, so messages stay tied to the correct pet, clinic, and visit."
      actions={
        <Link
          to="/appointments"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Back to appointments
        </Link>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-[#002045]">Conversations</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {conversations.length}
            </span>
          </div>

          {loadingList ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
              Loading conversations...
            </div>
          ) : conversations.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
              No appointment conversations yet.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {conversations.map((item) => {
                const isActive = item.appointment?._id === activeAppointmentId;

                return (
                  <button
                    key={item.appointment?._id}
                    type="button"
                    onClick={() => handleSelectConversation(item.appointment?._id)}
                    className={[
                      'w-full rounded-[24px] border p-4 text-left transition',
                      isActive
                        ? 'border-teal-300 bg-teal-50 shadow-sm'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[#002045]">
                          {item.participant?.name || 'Participant'}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                          {item.participant?.role === 'vet' ? 'Veterinarian' : 'Pet owner'}
                        </div>
                      </div>
                      {item.unreadCount > 0 ? (
                        <span className="rounded-full bg-[#002045] px-2.5 py-1 text-xs font-bold text-white">
                          {item.unreadCount}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 text-sm text-slate-700">
                      {item.appointment?.petName} at{' '}
                      {item.appointment?.clinic?.clinicName || 'Clinic'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatFriendlyDate(item.appointment?.appointmentDate)}
                      {item.appointment?.slotLabel ? ` • ${item.appointment.slotLabel}` : ''}
                    </div>
                    <div className="mt-3 line-clamp-2 text-sm text-slate-500">
                      {item.lastMessage?.content || 'No messages yet. Start the conversation.'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          {!activeAppointmentId ? (
            <div className="p-8 text-sm text-slate-500">
              Pick a conversation from the left to view messages.
            </div>
          ) : loadingConversation ? (
            <div className="p-8 text-sm text-slate-500">Loading messages...</div>
          ) : conversation ? (
            <div className="flex min-h-[680px] flex-col">
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="font-display text-3xl font-bold text-[#002045]">
                      {conversation.participant?.name ||
                        activeSummary?.participant?.name ||
                        'Conversation'}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {conversation.appointment?.petName} •{' '}
                      {conversation.appointment?.clinic?.clinicName || 'Clinic'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                    <div className="font-semibold text-[#002045]">
                      {formatFriendlyDate(conversation.appointment?.appointmentDate)}
                    </div>
                    <div>{conversation.appointment?.slotLabel}</div>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-6 py-6">
                {conversation.messages?.length ? (
                  conversation.messages.map((message) => {
                    const isCurrentUser = message.sender?._id === currentUser?._id;

                    return (
                      <div
                        key={message._id}
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={[
                            'max-w-[85%] rounded-[24px] px-4 py-3 shadow-sm',
                            isCurrentUser
                              ? 'bg-[#002045] text-white'
                              : 'border border-slate-200 bg-white text-slate-800',
                          ].join(' ')}
                        >
                          <div className="text-sm leading-7">{message.content}</div>
                          <div
                            className={`mt-2 text-xs ${isCurrentUser ? 'text-slate-200' : 'text-slate-500'}`}
                          >
                            {message.sender?.name} • {formatMessageTime(message.createdAt)}
                            {isCurrentUser && message.readAt ? ' • Seen' : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                    No messages yet. Send the first update for this appointment.
                  </div>
                )}
                <div ref={messageEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="border-t border-slate-200 p-5">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    New message
                  </span>
                  <textarea
                    rows={4}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={
                      currentUser?.role === 'vet'
                        ? 'Share instructions, follow-ups, or appointment updates for the pet owner.'
                        : 'Ask a question or reply to your vet.'
                    }
                    className="w-full rounded-[24px] border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white"
                  />
                </label>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Messages in this thread are visible only to the assigned vet and pet owner.
                  </p>
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="rounded-xl bg-[#002045] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1A365D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sending ? 'Sending...' : 'Send message'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-8 text-sm text-slate-500">
              The selected conversation could not be loaded.
            </div>
          )}
        </section>
      </div>
    </SiteLayout>
  );
}

export default MessagesPage;
