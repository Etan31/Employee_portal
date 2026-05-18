// Run with: node --env-file=.env scripts/check-tables.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
)

const listTableDetails = async () => {
  const { data, error } = await supabase.rpc('get_schema_details');

  if (error) {
    console.error('Error fetching schema:', error.message);
    return;
  }

  console.log("--- Database Schema Details ---");
  data.forEach(row => {
    console.log(`\nTable: ${row.table_name}`);
    console.log(`Columns: ${row.columns.join(', ')}`);
  });
};

listTableDetails();
