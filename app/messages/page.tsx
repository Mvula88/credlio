import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server-client';
import { ChatContainer } from '@/components/chat/chat-container';

export default async function MessagesPage() {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/auth/signin');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Messages</h1>
        <ChatContainer currentUserId={profile.id} />
      </div>
    </div>
  );
}