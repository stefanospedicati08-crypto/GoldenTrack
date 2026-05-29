import { createClient } from '@supabase/supabase-js';

// 1. Recuperiamo le chiavi di Supabase che Vercel ha inserito nell'ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Inizializziamo il VERO database (Supabase)
const supabase = createClient(supabaseUrl, supabaseKey);

// 3. Creiamo una funzione "ponte" che traduce i comandi Base44 in comandi Supabase
function createSupabaseAdapter(tableName) {
  return {
    create: async (data) => await supabase.from(tableName).insert(data),
    update: async (id, data) => await supabase.from(tableName).update(data).eq('id', id),
    logUpdate: async (id, data) => await supabase.from(tableName).update(data).eq('id', id),
    delete: async (id) => await supabase.from(tableName).delete().eq('id', id),
    get: async (id) => await supabase.from(tableName).select('*').eq('id', id).single(),
    list: async () => await supabase.from(tableName).select('*')
  };
}

// 4. Esportiamo il "finto" base44 che ingannerà il resto della tua applicazione
export const base44 = {
  auth: {
    updateMe: async (data) => await supabase.auth.updateUser({ data })
  },
  entities: {
    Workout: createSupabaseAdapter('workouts'),
    Exercise: createSupabaseAdapter('exercises'),
    User: createSupabaseAdapter('users'),
    Profile: createSupabaseAdapter('profiles')
  }
};