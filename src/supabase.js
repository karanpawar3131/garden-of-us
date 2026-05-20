import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vlezhnszokouizauemej.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Ig5kTB_0xjssTM1tsEzsew_nYnAu5yz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export const saveStory = async (id, { sender, partner, nickname, note, email, phone }) => {
  const { error } = await supabase
    .from('stories')
    .insert({ id, sender, partner, nickname, note, email, phone });
  if (error) throw error;
};

export const markStoryPaid = async (id, { razorpay_payment_id, amount_paid }) => {
  const { error } = await supabase
    .from('stories')
    .update({ payment_status: 'paid', razorpay_payment_id, amount_paid })
    .eq('id', id)
    .eq('payment_status', 'pending');
  if (error) throw error;
};

export const fetchStory = async (id) => {
  const { data, error } = await supabase
    .from('stories')
    .select('sender, partner, nickname, note')
    .eq('id', id)
    .eq('payment_status', 'paid')
    .maybeSingle();
  if (error) throw error;
  return data;
};
