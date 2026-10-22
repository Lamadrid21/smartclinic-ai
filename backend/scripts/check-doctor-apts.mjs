import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../frontend/.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkDoctorsAndAppointments() {
  const { data: doctors } = await supabase.from('doctors').select('id, name, specialization');
  const { data: appointments } = await supabase.from('appointments').select('id, doctor_id, patient_id, appointment_date, status, doctors(name)');
  
  console.log('--- DOCTORS ---');
  console.log(doctors);

  console.log('--- APPOINTMENTS PER DOCTOR ---');
  doctors.forEach(doc => {
    const docApts = appointments.filter(a => a.doctor_id === doc.id);
    console.log(`\nDoctor ID ${doc.id}: ${doc.name} (${docApts.length} total appointments)`);
    docApts.forEach(a => {
      console.log(`  - Apt ID ${a.id}: Date ${a.appointment_date}, Status ${a.status}`);
    });
  });
}
checkDoctorsAndAppointments();
