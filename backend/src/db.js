import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

if (supabase) {
  console.log('Supabase client initialized successfully.');
} else {
  console.warn('Supabase configuration missing in .env. Operating in stateless sandbox session mode.');
}

/**
 * Feeds or retrieves a standard demo user ID from Supabase to satisfy SQL foreign key constraints.
 */
async function getOrCreateDemoUserId() {
  if (!supabase) return null;
  
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'demo@nexjob.com');

    if (error) {
      console.warn('Error querying user table:', error.message);
      return null;
    }

    if (users && users.length > 0) {
      return users[0].id;
    }

    // Insert mock user if none exists
    const { data: newUsers, error: insertError } = await supabase
      .from('users')
      .insert([{ email: 'demo@nexjob.com', full_name: 'Demo User' }])
      .select('id');

    if (insertError) {
      console.warn('Error inserting demo user:', insertError.message);
      return null;
    }

    return newUsers[0]?.id || null;
  } catch (err) {
    console.warn('Failed demo user check:', err);
    return null;
  }
}

/**
 * Saves original parsed resume data to Supabase.
 */
export async function saveResume(originalFilename, rawText, parsedJson) {
  if (!supabase) return null;

  try {
    const userId = await getOrCreateDemoUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('resumes')
      .insert([
        {
          user_id: userId,
          original_filename: originalFilename,
          raw_text: rawText,
          parsed_json: parsedJson
        }
      ])
      .select('id');

    if (error) {
      console.error('Error saving resume to Supabase:', error);
      return null;
    }

    return data[0]?.id || null;
  } catch (err) {
    console.error('Database write error:', err);
    return null;
  }
}

/**
 * Saves job description details to Supabase.
 */
export async function saveJobDescription(title, company, rawText, extractedKeywords) {
  if (!supabase) return null;

  try {
    const userId = await getOrCreateDemoUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('job_descriptions')
      .insert([
        {
          user_id: userId,
          title,
          company,
          raw_text: rawText,
          extracted_keywords: extractedKeywords
        }
      ])
      .select('id');

    if (error) {
      console.error('Error saving JD to Supabase:', error);
      return null;
    }

    return data[0]?.id || null;
  } catch (err) {
    console.error('Database write error:', err);
    return null;
  }
}

/**
 * Links a resume and JD to save the optimized tailored result in Supabase.
 */
export async function saveTailoredResult(
  resumeId, 
  jdId, 
  tailoredJson, 
  suggestedProjects, 
  scoreBefore, 
  scoreAfter
) {
  if (!supabase) return null;

  try {
    const userId = await getOrCreateDemoUserId();
    if (!userId) return null;

    // Supabase foreign keys will throw if resumeId or jdId are null,
    // so we only save if they are valid.
    if (!resumeId || !jdId) {
      console.warn('Cannot persist tailored resume without valid resumeId and jdId.');
      return null;
    }

    const { data, error } = await supabase
      .from('tailored_resumes')
      .insert([
        {
          user_id: userId,
          resume_id: resumeId,
          job_description_id: jdId,
          tailored_json: tailoredJson,
          suggested_projects: suggestedProjects,
          match_score_before: scoreBefore,
          match_score_after: scoreAfter
        }
      ])
      .select('id');

    if (error) {
      console.error('Error saving tailored result to Supabase:', error);
      return null;
    }

    return data[0]?.id || null;
  } catch (err) {
    console.error('Database write error:', err);
    return null;
  }
}
