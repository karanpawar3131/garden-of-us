import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vlezhnszokouizauemej.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Ig5kTB_0xjssTM1tsEzsew_nYnAu5yz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export const saveStory = async (id, { sender, partner, nickname, note }) => {
  const { error } = await supabase
    .from('stories')
    .insert({ id, sender, partner, nickname, note });
  if (error) throw error;
};

export const fetchStory = async (id) => {
  const { data, error } = await supabase
    .from('stories')
    .select('sender, partner, nickname, note')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
};
