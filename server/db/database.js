// Supabase database wrapper for Straps Security
import { supabase } from './supabase.js';

// Initialize - check connection
async function initDB() {
  const { data, error } = await supabase.from('users').select('count').limit(1);
  if (error) {
    console.error('Database connection error:', error.message);
  } else {
    console.log('Connected to Supabase!');
  }
}

// Query helper that mimics the prepare().get/all/run pattern
function prepare(sql) {
  return {
    async run(...params) {
      // Handle INSERT operations
      if (sql.includes('INSERT INTO users') && sql.includes('guard_type')) {
        const { data, error } = await supabase.from('users').insert({
          username: params[0], password_hash: params[1], name: params[2],
          initials: params[3], color: params[4], role: params[5] || 'guard',
          guard_type: params[6] || 'security'
        }).select('id').single();
        return { lastInsertRowid: data?.id || 0 };
      }
      if (sql.includes('INSERT INTO users')) {
        const { data, error } = await supabase.from('users').insert({
          username: params[0], password_hash: params[1], name: params[2],
          initials: params[3], color: params[4], role: params[5] || 'guard'
        }).select('id').single();
        return { lastInsertRowid: data?.id || 0 };
      }
      if (sql.includes('INSERT INTO checkins')) {
        const { data } = await supabase.from('checkins').insert({
          guard_id: params[0], location_id: params[1], type: 'checkin',
          lat: params[2], lng: params[3]
        }).select('id').single();
        return { lastInsertRowid: data?.id || 0 };
      }
      if (sql.includes('INSERT INTO guard_status')) {
        const { data } = await supabase.from('guard_status').insert({
          guard_id: params[0], status: params[1] || 'active',
          current_location_id: params[2], zone: params[3], lat: params[4], lng: params[5]
        }).select('id').single();
        return { lastInsertRowid: data?.id || 0 };
      }
      if (sql.includes('INSERT INTO activity_log')) {
        const { data } = await supabase.from('activity_log').insert({
          guard_id: params[0], location_id: params[1], action: params[2], details: params[3]
        }).select('id').single();
        return { lastInsertRowid: data?.id || 0 };
      }
      if (sql.includes('INSERT INTO shift_notes')) {
        const { data } = await supabase.from('shift_notes').insert({
          shift_id: params[0], guard_id: params[1], location_id: params[2],
          content: params[3], note_type: params[4] || 'general'
        }).select('id').single();
        return { lastInsertRowid: data?.id || 0 };
      }
      if (sql.includes('INSERT INTO location_history')) {
        const { data } = await supabase.from('location_history').insert({
          guard_id: params[0], lat: params[1], lng: params[2], accuracy: params[3]
        }).select('id').single();
        return { lastInsertRowid: data?.id || 0 };
      }
      if (sql.includes('INSERT INTO locations')) {
        const { data } = await supabase.from('locations').insert({
          name: params[0], address: params[1], lat: params[2], lng: params[3]
        }).select('id').single();
        return { lastInsertRowid: data?.id || 0 };
      }
      if (sql.includes('INSERT INTO shifts')) {
        const { data } = await supabase.from('shifts').insert({
          guard_id: params[0], location_id: params[1], start_time: params[2],
          end_time: params[3], zone: params[4], created_by: params[5]
        }).select('id').single();
        return { lastInsertRowid: data?.id || 0 };
      }
      if (sql.includes('INSERT INTO availability')) {
        const { data } = await supabase.from('availability').insert({
          guard_id: params[0], date: params[1], start_time: params[2],
          end_time: params[3], available: params[4]
        }).select('id').single();
        return { lastInsertRowid: data?.id || 0 };
      }

      // Handle UPDATE operations
      if (sql.includes('UPDATE guard_status') && sql.includes('status = ?, current_location_id')) {
        await supabase.from('guard_status').update({
          status: params[0], current_location_id: params[1], zone: params[2],
          lat: params[3], lng: params[4], last_updated: new Date().toISOString()
        }).eq('guard_id', params[5]);
      } else if (sql.includes('UPDATE guard_status') && sql.includes('lat = ?, lng = ?')) {
        await supabase.from('guard_status').update({
          lat: params[0], lng: params[1], last_updated: new Date().toISOString()
        }).eq('guard_id', params[2]);
      } else if (sql.includes('UPDATE guard_status') && sql.includes('status =')) {
        await supabase.from('guard_status').update({
          status: params[0], last_updated: new Date().toISOString()
        }).eq('guard_id', params[1]);
      }

      // Handle UPDATE users
      if (sql.includes('UPDATE users') && sql.includes('password_hash')) {
        await supabase.from('users').update({ password_hash: params[0] }).eq('id', params[1]);
      }
      if (sql.includes('UPDATE users') && sql.includes('COALESCE')) {
        const updates = {};
        if (params[0]) updates.name = params[0];
        if (params[1]) updates.color = params[1];
        if (params[2]) updates.guard_type = params[2];
        if (Object.keys(updates).length > 0) {
          await supabase.from('users').update(updates).eq('id', params[3]);
        }
      }

      // Handle DELETE operations
      if (sql.includes('DELETE FROM guard_status WHERE guard_id')) {
        await supabase.from('guard_status').delete().eq('guard_id', params[0]);
      }
      if (sql.includes('DELETE FROM users WHERE id')) {
        await supabase.from('users').delete().eq('id', params[0]).eq('role', params[1] || 'guard');
      }
      if (sql.includes('DELETE FROM locations')) {
        await supabase.from('locations').delete().eq('id', params[0]);
      }
      if (sql.includes('DELETE FROM shifts')) {
        await supabase.from('shifts').delete().eq('id', params[0]);
      }
      if (sql.includes('DELETE FROM shift_notes')) {
        await supabase.from('shift_notes').delete().eq('id', params[0]);
      }
      if (sql.includes('DELETE FROM availability')) {
        await supabase.from('availability').delete().eq('id', params[0]);
      }

      return { lastInsertRowid: 0 };
    },

    async get(...params) {
      // Users by username
      if (sql.includes('FROM users WHERE username')) {
        const { data } = await supabase.from('users')
          .select('*').eq('username', params[0]).single();
        return data;
      }
      // Users by id
      if (sql.includes('FROM users WHERE id')) {
        const { data } = await supabase.from('users')
          .select('id, username, name, initials, color, role').eq('id', params[0]).single();
        return data;
      }
      // Guard status by guard_id
      if (sql.includes('FROM guard_status WHERE guard_id')) {
        const { data } = await supabase.from('guard_status')
          .select('*').eq('guard_id', params[0]).single();
        return data;
      }
      // Location by id
      if (sql.includes('FROM locations WHERE id')) {
        const { data } = await supabase.from('locations')
          .select('*').eq('id', params[0]).single();
        return data;
      }
      // Availability
      if (sql.includes('FROM availability WHERE guard_id') && sql.includes('AND date')) {
        const { data } = await supabase.from('availability')
          .select('*').eq('guard_id', params[0]).eq('date', params[1]).single();
        return data;
      }
      // Shift note by id
      if (sql.includes('FROM shift_notes WHERE id')) {
        const { data } = await supabase.from('shift_notes')
          .select('*').eq('id', params[0]).single();
        return data;
      }
      // Locations covered count
      if (sql.includes('COUNT(DISTINCT current_location_id)')) {
        const { data } = await supabase.from('guard_status')
          .select('current_location_id')
          .in('status', ['active', 'break'])
          .not('current_location_id', 'is', null);
        const uniqueLocs = new Set(data?.map(d => d.current_location_id) || []);
        return { count: uniqueLocs.size };
      }
      // Guard with status
      if (sql.includes('FROM users u') && sql.includes('LEFT JOIN guard_status') && sql.includes('WHERE u.id')) {
        const { data: guard } = await supabase.from('users')
          .select('*').eq('id', params[0]).eq('role', 'guard').single();
        if (!guard) return undefined;
        const { data: status } = await supabase.from('guard_status')
          .select('*, locations(id, name)').eq('guard_id', guard.id).single();
        return {
          ...guard, ...status,
          location_id: status?.locations?.id,
          location_name: status?.locations?.name
        };
      }
      return undefined;
    },

    async all(...params) {
      // All users (for admin) - matches SELECT ... FROM users ORDER BY name (without WHERE role =)
      if (sql.includes('FROM users ORDER BY name') && !sql.includes("role = '")) {
        const { data } = await supabase.from('users')
          .select('id, username, name, initials, color, role, guard_type')
          .order('name');
        return data || [];
      }
      // All guards with status
      if (sql.includes('FROM users') && sql.includes("role = 'guard'")) {
        const { data: guards } = await supabase.from('users')
          .select('*').eq('role', 'guard').order('name');
        const { data: statuses } = await supabase.from('guard_status')
          .select('*, locations(id, name)');
        return guards?.map(g => {
          const s = statuses?.find(st => st.guard_id === g.id);
          return {
            ...g, ...s,
            location_id: s?.locations?.id,
            location_name: s?.locations?.name
          };
        }) || [];
      }
      // All locations
      if (sql.includes('FROM locations ORDER')) {
        const { data } = await supabase.from('locations').select('*').order('name');
        return data || [];
      }
      // Status counts
      if (sql.includes('FROM guard_status') && sql.includes('GROUP BY status')) {
        const { data } = await supabase.from('guard_status').select('status');
        const counts = {};
        data?.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1; });
        return Object.entries(counts).map(([status, count]) => ({ status, count }));
      }
      // Checkins by guard and date
      if (sql.includes('FROM checkins') && sql.includes('guard_id = ?')) {
        const { data } = await supabase.from('checkins')
          .select('*').eq('guard_id', params[0])
          .gte('timestamp', params[1]).lt('timestamp', params[1] + 'T23:59:59')
          .order('timestamp');
        return data || [];
      }
      // Today's activity
      if (sql.includes('FROM activity_log') && sql.includes('date(a.timestamp)')) {
        const today = params[0];
        const { data } = await supabase.from('activity_log')
          .select('*, users(name, initials, color), locations(name)')
          .gte('timestamp', today).lt('timestamp', today + 'T23:59:59')
          .order('timestamp', { ascending: false });
        return data?.map(a => ({
          ...a, guard_name: a.users?.name, initials: a.users?.initials,
          color: a.users?.color, location_name: a.locations?.name
        })) || [];
      }
      // Activity with limit
      if (sql.includes('FROM activity_log') && sql.includes('LIMIT')) {
        const { data } = await supabase.from('activity_log')
          .select('*, users(name, initials, color), locations(name)')
          .order('timestamp', { ascending: false }).limit(params[0]);
        return data?.map(a => ({
          ...a, guard_name: a.users?.name, initials: a.users?.initials,
          color: a.users?.color, location_name: a.locations?.name
        })) || [];
      }
      // Today's notes
      if (sql.includes('FROM shift_notes') && sql.includes('date(n.created_at)')) {
        const today = params[0];
        const { data } = await supabase.from('shift_notes')
          .select('*, users(name, initials, color), locations(name)')
          .gte('created_at', today).lt('created_at', today + 'T23:59:59')
          .order('created_at', { ascending: false });
        return data?.map(n => ({
          ...n, guard_name: n.users?.name, initials: n.users?.initials,
          color: n.users?.color, location_name: n.locations?.name
        })) || [];
      }
      // Notes by guard
      if (sql.includes('FROM shift_notes') && sql.includes('guard_id = ?')) {
        const { data } = await supabase.from('shift_notes')
          .select('*, users(name, initials, color), locations(name)')
          .eq('guard_id', params[0])
          .order('created_at', { ascending: false }).limit(params[1] || 50);
        return data?.map(n => ({
          ...n, guard_name: n.users?.name, initials: n.users?.initials,
          color: n.users?.color, location_name: n.locations?.name
        })) || [];
      }
      // Active guards for map
      if (sql.includes("status IN ('active', 'break')")) {
        const { data } = await supabase.from('guard_status')
          .select('*, users(id, name, initials, color), locations(name)')
          .in('status', ['active', 'break']);
        return data?.map(s => ({
          ...s.users, ...s, location_name: s.locations?.name
        })) || [];
      }
      // Shifts
      if (sql.includes('FROM shifts')) {
        const { data } = await supabase.from('shifts')
          .select('*, users(name, initials, color), locations(name)')
          .order('start_time');
        return data?.map(s => ({
          ...s, guard_name: s.users?.name, initials: s.users?.initials,
          color: s.users?.color, location_name: s.locations?.name
        })) || [];
      }
      return [];
    }
  };
}

export { initDB, prepare };
export default { initDB, prepare };
