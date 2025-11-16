import { supabase } from '../supabase-client';
import { Flyer } from '../types';

/**
 * Record a calendar add action for the current user and flyer.
 * Returns true on success so callers can decide whether to show errors.
 */
export async function recordCalendarAdd(email: string | null | undefined, flyer: Flyer): Promise<boolean> {
  if (!email) {
    console.warn('Skipping calendar_add insert because no user email is available');
    return false;
  }

  const { error } = await supabase.from('calendar_add').insert({
    email,
    image_id: flyer.id,
    image_url: flyer.imageUrl,
    count: 1,
  });

  if (error) {
    console.error('Failed to insert calendar_add row', error);
    return false;
  }

  return true;
}
