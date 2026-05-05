import { supabase } from './supabaseClient.js';

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
    // This format makes it easy to copy for your models or API fetching
  });
};

listTableDetails();