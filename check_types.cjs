const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://crreoeautoqzcgtlwlsd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8'
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('tata_consumption_data').select('order_type, invoice_type');
  if (data) {
    const orderTypes = [...new Set(data.map(d => d.order_type))];
    const invoiceTypes = [...new Set(data.map(d => d.invoice_type))];
    console.log('Order Types:', orderTypes);
    console.log('Invoice Types:', invoiceTypes);
  }
}

check();
