'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  MessageSquare,
  PenSquare,
  Send,
  Search,
  X,
  Inbox,
  Loader2,
  Paperclip,
  ArrowLeft,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { useAuth } from '@/app/components/providers/auth-provider';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Skeleton } from '@/app/components/ui/skeleton';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Separator } from '@/app/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { supabase } from '@/app/lib/supabase/client';
import type { Message, Profile } from '@/app/lib/types/database';
import { formatDateTime, formatDate } from '@/app/lib/types/ui';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MessageWithProfiles extends Message {
  sender: Pick<Profile, 'id' | 'email' | 'full_name' | 'role'> | null;
  recipient: Pick<Profile, 'id' | 'email' | 'full_name' | 'role'> | null;
}

interface Thread {
  thread_id: string;
  subject: string;
  last_message: MessageWithProfiles;
  unread_count: number;
  other_party: Pick<Profile, 'id' | 'email' | 'full_name' | 'role'> | null;
  message_count: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  const base = (name || email || '?').trim();
  const parts = base.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

// Generate a stable thread id for new conversations
function generateThreadId(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminMessagesPage() {
  const { user } = useAuth();
  const currentUserId = user?.id;

  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<MessageWithProfiles[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);

  // New message dialog
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipients, setRecipients] = useState<Profile[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [newRecipientId, setNewRecipientId] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [creating, setCreating] = useState(false);

  // Search threads
  const [threadSearch, setThreadSearch] = useState('');

  // Mobile: show thread list or conversation
  const [mobileView, setMobileView] = useState<'list' | 'conversation'>('list');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // Fetch threads (conversations involving the current user, grouped by thread_id)
  // -------------------------------------------------------------------------

  const fetchThreads = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);

    // Fetch all messages where the user is sender or recipient, newest first.
    const { data, error } = await supabase
      .from('messages')
      .select(
        '*, sender:profiles!messages_sender_id_fkey(id, email, full_name, role), recipient:profiles!messages_recipient_id_fkey(id, email, full_name, role)'
      )
      .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load messages');
      console.error(error);
      setLoading(false);
      return;
    }

    const messages = (data || []) as unknown as MessageWithProfiles[];

    // Group by thread_id and build thread summaries.
    const threadMap = new Map<string, Thread>();
    for (const msg of messages) {
      const existing = threadMap.get(msg.thread_id);
      const isUnread = !msg.is_read && msg.recipient_id === currentUserId;

      if (!existing) {
        const otherParty =
          msg.sender_id === currentUserId ? msg.recipient : msg.sender;
        threadMap.set(msg.thread_id, {
          thread_id: msg.thread_id,
          subject: msg.subject || '(no subject)',
          last_message: msg, // messages are ordered desc, so first is most recent
          unread_count: isUnread ? 1 : 0,
          other_party: otherParty,
          message_count: 1,
        });
      } else {
        existing.message_count += 1;
        if (isUnread) existing.unread_count += 1;
        // last_message is already the most recent because of ordering
      }
    }

    // Sort threads by last message time (most recent first).
    const sorted = Array.from(threadMap.values()).sort(
      (a, b) =>
        new Date(b.last_message.created_at).getTime() -
        new Date(a.last_message.created_at).getTime()
    );

    setThreads(sorted);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // -------------------------------------------------------------------------
  // Fetch messages for the selected thread
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // Mark messages in a thread as read
  // -------------------------------------------------------------------------

  const markThreadAsRead = useCallback(
    async (threadId: string) => {
      if (!currentUserId) return;

      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('thread_id', threadId)
        .eq('recipient_id', currentUserId)
        .eq('is_read', false);

      if (error) {
        console.error('Failed to mark messages as read:', error);
        return;
      }

      // Update local thread state to reflect read status.
      setThreads((prev) =>
        prev.map((t) =>
          t.thread_id === threadId ? { ...t, unread_count: 0 } : t
        )
      );
    },
    [currentUserId]
  );

  // -------------------------------------------------------------------------
  // Fetch messages for the selected thread
  // -------------------------------------------------------------------------

  const fetchThreadMessages = useCallback(
    async (threadId: string) => {
      if (!currentUserId) return;
      setThreadLoading(true);

      const { data, error } = await supabase
        .from('messages')
        .select(
          '*, sender:profiles!messages_sender_id_fkey(id, email, full_name, role), recipient:profiles!messages_recipient_id_fkey(id, email, full_name, role)'
        )
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      setThreadLoading(false);

      if (error) {
        toast.error('Failed to load conversation');
        console.error(error);
        return;
      }

      setThreadMessages((data || []) as unknown as MessageWithProfiles[]);

      // Mark messages addressed to the current user as read.
      await markThreadAsRead(threadId);
    },
    [currentUserId, markThreadAsRead]
  );

  useEffect(() => {
    if (selectedThreadId) {
      fetchThreadMessages(selectedThreadId);
      setMobileView('conversation');
    } else {
      setThreadMessages([]);
      setMobileView('list');
    }
  }, [selectedThreadId, fetchThreadMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (threadMessages.length > 0) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [threadMessages]);

  // -------------------------------------------------------------------------
  // Fetch recipients for the New Message dialog
  // -------------------------------------------------------------------------

  const fetchRecipients = useCallback(async () => {
    if (!currentUserId) return;
    setRecipientsLoading(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, avatar_url, phone, is_active')
      .neq('id', currentUserId)
      .order('full_name', { ascending: true });

    setRecipientsLoading(false);

    if (error) {
      console.error(error);
      return;
    }

    setRecipients((data || []) as unknown as Profile[]);
  }, [currentUserId]);

  useEffect(() => {
    if (newMessageOpen) {
      fetchRecipients();
    }
  }, [newMessageOpen, fetchRecipients]);

  // -------------------------------------------------------------------------
  // Send a reply in the selected thread
  // -------------------------------------------------------------------------

  const selectedThread = useMemo(
    () => threads.find((t) => t.thread_id === selectedThreadId) ?? null,
    [threads, selectedThreadId]
  );

  const handleSendReply = async () => {
    if (!currentUserId || !selectedThreadId || !selectedThread) return;
    const body = replyBody.trim();
    if (!body) return;

    // The recipient is the "other party" in the thread.
    const recipientId = selectedThread.other_party?.id;
    if (!recipientId) {
      toast.error('Could not determine the recipient for this thread');
      return;
    }

    setSending(true);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        thread_id: selectedThreadId,
        sender_id: currentUserId,
        recipient_id: recipientId,
        subject: selectedThread.subject,
        body,
        is_read: false,
      })
      .select(
        '*, sender:profiles!messages_sender_id_fkey(id, email, full_name, role), recipient:profiles!messages_recipient_id_fkey(id, email, full_name, role)'
      )
      .single();

    setSending(false);

    if (error || !data) {
      toast.error('Failed to send message');
      console.error(error);
      return;
    }

    const newMessage = data as unknown as MessageWithProfiles;
    setThreadMessages((prev) => [...prev, newMessage]);
    setReplyBody('');

    // Update the thread summary so the list stays in sync.
    setThreads((prev) => {
      const updated = prev.map((t) =>
        t.thread_id === selectedThreadId
          ? {
              ...t,
              last_message: newMessage,
              message_count: t.message_count + 1,
            }
          : t
      );
      // Re-sort so the most recently active thread is on top.
      return updated.sort(
        (a, b) =>
          new Date(b.last_message.created_at).getTime() -
          new Date(a.last_message.created_at).getTime()
      );
    });

    toast.success('Message sent');
  };

  // -------------------------------------------------------------------------
  // Start a new conversation
  // -------------------------------------------------------------------------

  const resetNewMessageForm = () => {
    setNewRecipientId('');
    setNewSubject('');
    setNewBody('');
    setRecipientSearch('');
  };

  const handleStartConversation = async () => {
    if (!currentUserId) return;

    if (!newRecipientId) {
      toast.error('Please select a recipient');
      return;
    }
    if (!newBody.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setCreating(true);

    const threadId = generateThreadId();

    const { data, error } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        sender_id: currentUserId,
        recipient_id: newRecipientId,
        subject: newSubject.trim() || null,
        body: newBody.trim(),
        is_read: false,
      })
      .select(
        '*, sender:profiles!messages_sender_id_fkey(id, email, full_name, role), recipient:profiles!messages_recipient_id_fkey(id, email, full_name, role)'
      )
      .single();

    setCreating(false);

    if (error || !data) {
      toast.error('Failed to start conversation');
      console.error(error);
      return;
    }

    const newMessage = data as unknown as MessageWithProfiles;

    // Build a new thread entry and prepend it.
    const newThread: Thread = {
      thread_id: threadId,
      subject: newMessage.subject || '(no subject)',
      last_message: newMessage,
      unread_count: 0,
      other_party: newMessage.recipient,
      message_count: 1,
    };

    setThreads((prev) => [newThread, ...prev]);
    resetNewMessageForm();
    setNewMessageOpen(false);
    setSelectedThreadId(threadId);

    toast.success('Conversation started');
  };

  // -------------------------------------------------------------------------
  // Filtered threads (search by subject or other party name/email)
  // -------------------------------------------------------------------------

  const filteredThreads = useMemo(() => {
    const q = threadSearch.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const subject = t.subject.toLowerCase();
      const name = (t.other_party?.full_name || '').toLowerCase();
      const email = (t.other_party?.email || '').toLowerCase();
      return subject.includes(q) || name.includes(q) || email.includes(q);
    });
  }, [threads, threadSearch]);

  const totalUnread = useMemo(
    () => threads.reduce((sum, t) => sum + t.unread_count, 0),
    [threads]
  );

  const filteredRecipients = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter((r) => {
      const name = (r.full_name || '').toLowerCase();
      const email = (r.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [recipients, recipientSearch]);

  // -------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderThreadAvatar = (thread: Thread) => {
    const name = thread.other_party?.full_name;
    const email = thread.other_party?.email || '?';
    return (
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
          {getInitials(name, email)}
        </AvatarFallback>
      </Avatar>
    );
  };

  const renderMessageBubble = (msg: MessageWithProfiles, index: number) => {
    const isSender = msg.sender_id === currentUserId;
    const prev = threadMessages[index - 1];
    const showDateSeparator =
      !prev || !isSameDay(prev.created_at, msg.created_at);

    return (
      <div key={msg.id}>
        {showDateSeparator && (
          <div className="my-3 flex items-center justify-center">
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              {formatDate(msg.created_at)}
            </span>
          </div>
        )}
        <div
          className={`flex items-end gap-2 ${
            isSender ? 'justify-end' : 'justify-start'
          }`}
        >
          {!isSender && (
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="bg-muted text-[10px] font-semibold">
                {getInitials(msg.sender?.full_name, msg.sender?.email || '?')}
              </AvatarFallback>
            </Avatar>
          )}
          <div
            className={`flex max-w-[75%] flex-col ${
              isSender ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`rounded-2xl px-3.5 py-2 text-sm ${
                isSender
                  ? 'rounded-br-sm bg-primary text-primary-foreground'
                  : 'rounded-bl-sm bg-muted text-foreground'
              }`}
            >
              <p className="whitespace-pre-line break-words">{msg.body}</p>
            </div>
            <span className="mt-1 px-1 text-[11px] text-muted-foreground">
              {formatTime(msg.created_at)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DashboardShell>
      <PageHeader
        title="Messages"
        description="Communicate with suppliers, customers, and team members"
        action={
          <Button onClick={() => setNewMessageOpen(true)} className="gap-2">
            <PenSquare className="h-4 w-4" />
            New Message
          </Button>
        }
      />

      <div className="grid h-[calc(100vh-12rem)] grid-cols-1 overflow-hidden rounded-lg border border-border/40 bg-card md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr]">
        {/* ----------------------------------------------------------------- */}
        {/* Thread list (left column)                                          */}
        {/* ----------------------------------------------------------------- */}
        <div
          className={`flex flex-col border-r border-border/40 ${
            mobileView === 'conversation' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search */}
          <div className="border-b border-border/40 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={threadSearch}
                onChange={(e) => setThreadSearch(e.target.value)}
                className="pl-9 pr-8"
              />
              {threadSearch && (
                <button
                  onClick={() => setThreadSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Thread list */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="space-y-2 p-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-2">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Inbox className="h-7 w-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {threadSearch ? 'No conversations found' : 'No messages yet'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {threadSearch
                      ? 'Try a different search term.'
                      : 'Start a new conversation by clicking "New Message".'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {filteredThreads.map((thread) => {
                  const isSelected = thread.thread_id === selectedThreadId;
                  const last = thread.last_message;
                  const isLastFromMe = last.sender_id === currentUserId;
                  return (
                    <button
                      key={thread.thread_id}
                      onClick={() => setSelectedThreadId(thread.thread_id)}
                      className={`flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted/40 ${
                        isSelected ? 'bg-muted/60' : ''
                      }`}
                    >
                      {renderThreadAvatar(thread)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">
                            {thread.other_party?.full_name ||
                              thread.other_party?.email ||
                              'Unknown'}
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatDate(last.created_at)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                          {thread.subject}
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-muted-foreground">
                            {isLastFromMe && 'You: '}
                            {last.body}
                          </p>
                          {thread.unread_count > 0 && (
                            <Badge className="shrink-0 bg-primary text-primary-foreground">
                              {thread.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer summary */}
          {!loading && threads.length > 0 && (
            <div className="border-t border-border/40 px-3 py-2 text-xs text-muted-foreground">
              {threads.length} conversation{threads.length === 1 ? '' : 's'}
              {totalUnread > 0 && (
                <span className="ml-1 font-medium text-primary">
                  · {totalUnread} unread
                </span>
              )}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Conversation pane (right column)                                   */}
        {/* ----------------------------------------------------------------- */}
        <div
          className={`flex flex-col ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedThreadId && selectedThread ? (
            <>
              {/* Conversation header */}
              <div className="flex items-center gap-3 border-b border-border/40 p-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileView('list')}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(
                      selectedThread.other_party?.full_name,
                      selectedThread.other_party?.email || '?'
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">
                      {selectedThread.other_party?.full_name ||
                        selectedThread.other_party?.email ||
                        'Unknown'}
                    </span>
                    {selectedThread.other_party?.role && (
                      <Badge variant="secondary" className="capitalize">
                        {selectedThread.other_party.role.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedThread.subject}
                  </p>
                </div>
              </div>

              {/* Messages */}
          <ScrollArea className="flex-1">
                <div className="space-y-1 p-4">
                  {threadLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`flex ${
                            i % 2 === 0 ? 'justify-start' : 'justify-end'
                          }`}
                        >
                          <Skeleton
                            className={`h-16 ${
                              i % 2 === 0 ? 'w-2/3' : 'w-1/2'
                            } rounded-2xl`}
                          />
                        </div>
                      ))}
                    </div>
                  ) : threadMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                        <MessageSquare className="h-7 w-7 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        No messages in this thread
                      </p>
                    </div>
                  ) : (
                    <>
                      {threadMessages.map((msg, i) => renderMessageBubble(msg, i))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
              </ScrollArea>

              {/* Reply input */}
              <div className="border-t border-border/40 p-3">
                <div className="flex items-end gap-2">
                  <Textarea
                    placeholder="Type a reply..."
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    rows={1}
                    className="max-h-32 min-h-[40px] resize-none flex-1"
                    disabled={sending}
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={sending || !replyBody.trim()}
                    size="icon"
                    className="h-10 w-10 shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span className="sr-only">Send message</span>
                  </Button>
                </div>
                <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
                  Press Enter to send, Shift+Enter for a new line
                </p>
              </div>
            </>
          ) : (
            // No thread selected — empty state
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Select a conversation</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Choose a conversation from the list to view messages, or start
                  a new one with the “New Message” button.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-1 gap-2"
                onClick={() => setNewMessageOpen(true)}
              >
                <PenSquare className="h-4 w-4" />
                New Message
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* New Message Dialog                                                     */}
      {/* --------------------------------------------------------------------- */}
      <Dialog
        open={newMessageOpen}
        onOpenChange={(open) => {
          setNewMessageOpen(open);
          if (!open) resetNewMessageForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>
              Start a new conversation with a supplier, customer, or team member.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Recipient search + select */}
            <div className="space-y-1.5">
              <Label htmlFor="recipient-search">Recipient</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="recipient-search"
                  placeholder="Search by name or email..."
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  className="pl-9"
                  disabled={!!newRecipientId}
                />
                {newRecipientId && (
                  <button
                    onClick={() => {
                      setNewRecipientId('');
                      setRecipientSearch('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Selected recipient chip */}
              {newRecipientId ? (
                <div className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/40 px-3 py-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                      {getInitials(
                        recipients.find((r) => r.id === newRecipientId)
                          ?.full_name || null,
                        recipients.find((r) => r.id === newRecipientId)?.email ||
                          '?'
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {recipients.find((r) => r.id === newRecipientId)
                        ?.full_name || 'Unknown'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {recipients.find((r) => r.id === newRecipientId)?.email}
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {recipients
                      .find((r) => r.id === newRecipientId)
                      ?.role.replace('_', ' ') || ''}
                  </Badge>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-md border border-border/40">
                  {recipientsLoading ? (
                    <div className="space-y-2 p-2">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center gap-2 p-1">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="flex-1 space-y-1">
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-2 w-48" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredRecipients.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {recipientSearch
                        ? 'No recipients match your search.'
                        : 'No recipients available.'}
                    </div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {filteredRecipients.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            setNewRecipientId(r.id);
                            setRecipientSearch('');
                          }}
                          className="flex w-full items-center gap-2 p-2 text-left transition-colors hover:bg-muted/40"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                              {getInitials(r.full_name, r.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {r.full_name || r.email}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {r.email}
                            </p>
                          </div>
                          <Badge variant="secondary" className="capitalize">
                            {r.role.replace('_', ' ')}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label htmlFor="new-subject">Subject</Label>
              <Input
                id="new-subject"
                placeholder="Enter a subject..."
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
              />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <Label htmlFor="new-body">Message</Label>
              <Textarea
                id="new-body"
                placeholder="Type your message..."
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={4}
              />
            </div>

            {/* Attachment (display only — no upload wired) */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Paperclip className="h-4 w-4" />
              <span>Attachments are not yet supported.</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewMessageOpen(false);
                resetNewMessageForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartConversation}
              disabled={creating || !newRecipientId || !newBody.trim()}
              className="gap-2"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
