'use client';

import { useEffect, useState, useRef } from 'react';
import { MessageSquare, Send, Plus, Loader2, Inbox } from 'lucide-react';
import { DashboardShell } from '@/app/components/dashboard/dashboard-shell';
import { PageHeader } from '@/app/components/dashboard/page-header';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { useAuth } from '@/app/components/providers/auth-provider';
import { supabase } from '@/app/lib/supabase/client';
import { formatDateTime } from '@/app/lib/types/ui';
import { toast } from 'sonner';

export default function SupplierMessages() {
  const { user, profile } = useAuth();
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [newDialog, setNewDialog] = useState(false);
  const [newForm, setNewForm] = useState({  subject: '', body: '' });
  const [submitting, setSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(id, email, full_name, role), recipient:profiles!messages_recipient_id_fkey(id, email, full_name, role)')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      const allMsgs = data || [];
      const threadMap: Record<string, any> = {};
      allMsgs.forEach(m => {
        if (!threadMap[m.thread_id]) {
          const other = m.sender_id === user.id ? m.recipient : m.sender;
          threadMap[m.thread_id] = { thread_id: m.thread_id, subject: m.subject, other, lastMessage: m, unread: 0, messages: [] };
        }
        threadMap[m.thread_id].messages.push(m);
        if (m.recipient_id === user.id && !m.is_read) threadMap[m.thread_id].unread++;
        if (new Date(m.created_at) > new Date(threadMap[m.thread_id].lastMessage.created_at)) {
          threadMap[m.thread_id].lastMessage = m;
        }
      });
      const threadList = Object.values(threadMap).sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
      setThreads(threadList);
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (activeThread) {
      setMessages(activeThread.messages.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      if (user) {
        supabase.from('messages').update({ is_read: true }).eq('thread_id', activeThread.thread_id).eq('recipient_id', user.id).then(() => {
          setThreads(prev => prev.map(t => t.thread_id === activeThread.thread_id ? { ...t, unread: 0 } : t));
        });
      }
    }
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [activeThread, user]);

  const sendReply = async () => {
    if (!reply.trim() || !activeThread || !user) return;
    const otherId = activeThread.other?.id;
    const { data, error } = await supabase.from('messages').insert({
      thread_id: activeThread.thread_id,
      sender_id: user.id,
      recipient_id: otherId,
      subject: activeThread.subject,
      body: reply,
    }).select('*, sender:profiles!messages_sender_id_fkey(id, email, full_name, role), recipient:profiles!messages_recipient_id_fkey(id, email, full_name, role)').single();
    if (error) { toast.error(error.message); return; }
    setMessages(prev => [...prev, data]);
    setReply('');
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  

const startConversation = async () => {
  if (!newForm.body || !user) return;

  setSubmitting(true);

  // Find current platform admin
  const { data: admin, error: adminError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'super_admin')
    .single();

  if (adminError || !admin) {
    setSubmitting(false);
    toast.error('Platform admin not found');
    return;
  }

  const threadId = crypto.randomUUID();

  const { error } = await supabase
    .from('messages')
    .insert({
      thread_id: threadId,
      sender_id: user.id,
      recipient_id: admin.id,
      subject: newForm.subject || 'Supplier Message',
      body: newForm.body,
    });

  setSubmitting(false);

  if (error) {
    toast.error(error.message);
    return;
  }

  toast.success('Message sent');

  setNewDialog(false);

  setNewForm({
    subject: '',
    body: ''
  });

  window.location.reload();
};

  return (
    <DashboardShell>
      <PageHeader title="Messages" description="Communicate with the platform team" action={<Button className="gap-2" onClick={() => setNewDialog(true)}><Plus className="h-4 w-4" /> New Message</Button>} />

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <Card className="border-border/40 h-[600px] overflow-hidden">
          <CardContent className="p-0 h-full">
            <ScrollArea className="h-full">
              {loading ? (
                <div className="space-y-2 p-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : threads.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center p-8">
                  <Inbox className="h-12 w-12 text-muted-foreground/40" />
                  <p className="mt-4 text-sm text-muted-foreground">No conversations yet</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {threads.map(thread => (
                    <button key={thread.thread_id} onClick={() => setActiveThread(thread)} className={`flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors ${activeThread?.thread_id === thread.thread_id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                      <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-primary text-xs">{(thread.other?.full_name || thread.other?.email || '?')[0]?.toUpperCase()}</AvatarFallback></Avatar>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">{thread.other?.full_name || thread.other?.email || 'Unknown'}</p>
                          {thread.unread > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{thread.unread}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{thread.subject}</p>
                        <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{thread.lastMessage.body}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border-border/40 h-[600px] flex flex-col">
          <CardContent className="p-0 flex-1 flex flex-col">
            {activeThread ? (
              <>
                <div className="border-b border-border/40 p-4">
                  <p className="font-medium">{activeThread.subject}</p>
                  <p className="text-xs text-muted-foreground">{activeThread.other?.email}</p>
                </div>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages.map(msg => {
                      const isSent = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-lg p-3 ${isSent ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                            <p className="text-sm">{msg.body}</p>
                            <p className={`text-xs mt-1 ${isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{formatDateTime(msg.created_at)}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <div className="border-t border-border/40 p-3 flex gap-2">
                  <Textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your reply..." rows={1} className="resize-none" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }} />
                  <Button size="icon" onClick={sendReply} disabled={!reply.trim()}><Send className="h-4 w-4" /></Button>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-sm text-muted-foreground">Select a conversation to start messaging</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>Start a new conversation with the platform team</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="space-y-2">
               <Label>Recipient</Label>
                <Input 
                  value="Hidaya B2B Market Platform Team" 
                  disabled 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={newForm.subject} onChange={e => setNewForm({ ...newForm, subject: e.target.value })} placeholder="Message subject" />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={newForm.body} onChange={e => setNewForm({ ...newForm, body: e.target.value })} rows={4} placeholder="Type your message..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancel</Button>
            <Button onClick={startConversation} disabled={submitting || !newForm.body}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}


