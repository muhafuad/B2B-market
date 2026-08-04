'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Search,
  X,
  Plus,
  Mail,
  MailOpen,
  Loader2,
  Reply,
  ArrowLeft,
} from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Textarea } from '@/app/components/ui/textarea';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Separator } from '@/app/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { supabase } from '@/app/lib/supabase/client';
import { formatDateTime } from '@/app/lib/types/ui';
import type { Message, Profile } from '@/app/lib/types/database';
import { useAuth } from '@/app/components/providers/auth-provider';
import { getSuperAdminId } from "@/app/lib/supabase/get-admin";
import { toast } from 'sonner';

interface ThreadMessage extends Message {}

export default function MessagesPage() {
  const { profile, user } = useAuth();
  const [threads, setThreads] = useState<{ thread_id: string; messages: ThreadMessage[] }[]>([]);
  const [adminProfiles, setAdminProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // New message dialog
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newRecipient, setNewRecipient] = useState('');

  const fetchMessages = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // Fetch messages where user is sender or recipient
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: true });

    if (error) {
      toast.error('Failed to load messages');
      console.error(error);
    } else if (data) {
      // Group by thread_id
      const threadMap = new Map<string, ThreadMessage[]>();
      (data as unknown as Message[]).forEach((msg) => {
        const existing = threadMap.get(msg.thread_id) || [];
        existing.push(msg);
        threadMap.set(msg.thread_id, existing);
      });

      // Sort threads by last message date (desc)
      const threadArray = Array.from(threadMap.entries())
        .map(([thread_id, messages]) => ({ thread_id, messages }))
        .sort((a, b) => {
          const aLast = a.messages[a.messages.length - 1]?.created_at || '';
          const bLast = b.messages[b.messages.length - 1]?.created_at || '';
          return bLast.localeCompare(aLast);
        });

      setThreads(threadArray);
    }

    // Fetch admin profiles for new message recipient
    const { data: admins } = await supabase
      .from('profiles')
      .select('id, email, role, is_active')
      .eq('role', 'super_admin')
      .eq('is_active', true);
      console.log("Admins:", admins);
      console.log("Error:", error);

    setAdminProfiles((admins as unknown as Profile[]) || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Scroll to bottom on thread open / new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedThread, threads]);

  // Mark messages as read
  useEffect(() => {
    if (!selectedThread || !user?.id) return;
    const thread = threads.find((t) => t.thread_id === selectedThread);
    if (!thread) return;

    const unread = thread.messages.filter(
      (m) => m.recipient_id === user.id && !m.is_read
    );

    if (unread.length > 0) {
      unread.forEach(async (msg) => {
        await supabase.from('messages').update({ is_read: true }).eq('id', msg.id);
      });
      // Update local state
      setThreads((prev) =>
        prev.map((t) =>
          t.thread_id === selectedThread
            ? {
                ...t,
                messages: t.messages.map((m) =>
                  m.recipient_id === user.id ? { ...m, is_read: true } : m
                ),
              }
            : t
        )
      );
    }
  }, [selectedThread, user?.id, threads]);

  const handleSendReply = async () => {
    if (!selectedThread || !replyText.trim() || !user?.id) return;
    const thread = threads.find((t) => t.thread_id === selectedThread);
    if (!thread) return;

    // Determine recipient (the other party in the thread)
    const lastInbound = [...thread.messages]
      .reverse()
      .find((m) => m.recipient_id === user.id);
    const recipientId = lastInbound?.sender_id || null;

    setSending(true);
    const { error } = await supabase.from('messages').insert({
      thread_id: selectedThread,
      sender_id: user.id,
      recipient_id: recipientId,
      subject: thread.messages[0]?.subject || null,
      body: replyText.trim(),
      is_read: false,
    });

    setSending(false);

    if (error) {
      toast.error('Failed to send message');
      console.error(error);
      return;
    }

    setReplyText('');
    toast.success('Message sent');
    fetchMessages();
  };

  const handleNewMessage = async () => {
    if (!user?.id || !newBody.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);
    const threadId = crypto.randomUUID();
    const recipientId =
    newRecipient === "support" || !newRecipient
    ? await getSuperAdminId()
    : newRecipient;
   if (!recipientId) {
     toast.error("No support admin available");
     setSending(false);
     return;
   }

    const { error } = await supabase.from('messages').insert({
      thread_id: threadId,
      sender_id: user.id,
      recipient_id: recipientId,
      subject: newSubject.trim() || null,
      body: newBody.trim(),
      is_read: false,
    });

    setSending(false);

    if (error) {
      toast.error('Failed to send message');
      console.error(error);
      return;
    }

    toast.success('Message sent to support');
    setNewMsgOpen(false);
    setNewSubject('');
    setNewBody('');
    setNewRecipient('');
    fetchMessages();
  };

  const filteredThreads = threads.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const subject = t.messages[0]?.subject || '';
    return subject.toLowerCase().includes(q);
  });

  const currentThread = threads.find((t) => t.thread_id === selectedThread);
  const unreadCount = threads.reduce(
    (sum, t) =>
      sum + t.messages.filter((m) => m.recipient_id === user?.id && !m.is_read).length,
    0
  );

  return (
    <DashboardShell>
      <PageHeader
        title="Messages"
        description="Contact support and view your conversations"
        action={
          <Button onClick={() => setNewMsgOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Message
          </Button>
        }
      />

      <div className="flex h-[calc(100vh-12rem)] gap-4 overflow-hidden">
        {/* Thread List */}
        <div
          className={`${
            selectedThread ? 'hidden md:flex' : 'flex'
          } w-full flex-col md:w-80 lg:w-96 shrink-0`}
        >
          {/* Search */}
          <div className="mb-3 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Thread list */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <Card key={i} className="border-border/40 p-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </Card>
              ))
            ) : filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <MessageSquare className="h-7 w-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">No conversations</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Start a new message to contact support
                  </p>
                </div>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const lastMsg = thread.messages[thread.messages.length - 1];
                const subject = thread.messages[0]?.subject || 'No subject';
                const threadUnread = thread.messages.filter(
                  (m) => m.recipient_id === user?.id && !m.is_read
                ).length;
                const isActive = selectedThread === thread.thread_id;

                return (
                  <Card
                    key={thread.thread_id}
                    className={`cursor-pointer border-border/40 transition-colors hover:bg-muted/30 ${
                      isActive ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedThread(thread.thread_id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <MessageSquare className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium">{subject}</p>
                            {threadUnread > 0 && (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
                                {threadUnread}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {lastMsg?.body}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {lastMsg && formatDateTime(lastMsg.created_at)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Conversation View */}
        {selectedThread ? (
          <div className="hidden flex-1 flex-col md:flex">
            <Card className="flex flex-1 flex-col overflow-hidden border-border/40">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/40 p-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSelectedThread(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h3 className="text-sm font-semibold">
                      {currentThread?.messages[0]?.subject || 'Conversation'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {currentThread?.messages.length} message{currentThread?.messages.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
                {currentThread?.messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg p-3 ${
                          isMe
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <p className="text-sm">{msg.body}</p>
                        <p
                          className={`mt-1 text-xs ${
                            isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}
                        >
                          {formatDateTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply */}
              <div className="border-t border-border/40 p-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={2}
                    className="flex-1 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={sending || !replyText.trim()}
                    className="self-end gap-2"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="hidden flex-1 flex-col items-center justify-center gap-4 md:flex">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Mail className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-base font-medium">Select a conversation</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a thread from the list to view messages
              </p>
            </div>
          </div>
        )}
      </div>

      {/* New Message Dialog */}
      <Dialog open={newMsgOpen} onOpenChange={setNewMsgOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>
              Send a message to our support team. We'll get back to you as soon as possible.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="recipient">Recipient</Label>
              <Select
                value={newRecipient || "support"}
                onValueChange={setNewRecipient}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Support Team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="support">Support Team (General)</SelectItem>
                  {adminProfiles.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.full_name || admin.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="What is this about?"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Type your message..."
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMsgOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleNewMessage} disabled={sending || !newBody.trim()} className="gap-2">
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Send className="h-4 w-4" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
