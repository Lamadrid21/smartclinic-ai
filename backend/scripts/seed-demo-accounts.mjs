import { createClient } from "@supabase/supabase-js";
import config from "../config/env.js";

const admin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
const anon = createClient(config.supabaseUrl, config.supabaseAnonKey);

const DEMO_ACCOUNTS = [
  {
    email: "patient@example.com",
    password: "admin123",
    role: "patient",
    fullName: "Demo Patient",
    phone: "+63 912 345 6789",
  },
  {
    email: "doctor@example.com",
    password: "admin123",
    role: "doctor",
    fullName: "Dr. Demo Doctor",
    phone: "+63 923 456 7890",
    specialization: "General Medicine",
  },
  {
    email: "admin@example.com",
    password: "admin123",
    role: "admin",
    fullName: "Clinic Administrator",
    phone: "+63 934 567 8901",
  },
];

async function seedAccounts() {
  console.log("=== Provisioning Demo Accounts in Supabase ===");

  // Fetch all existing users
  const { data: usersData, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  if (listError) {
    console.error("Error listing users:", listError.message);
    process.exit(1);
  }

  const existingUsers = usersData?.users || [];

  for (const acc of DEMO_ACCOUNTS) {
    const existing = existingUsers.find(
      (u) => u.email?.toLowerCase() === acc.email.toLowerCase()
    );

    let userId;

    if (existing) {
      console.log(`Updating existing user: ${acc.email} (${acc.role})...`);
      const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(
        existing.id,
        {
          password: acc.password,
          email_confirm: true,
          user_metadata: {
            role: acc.role,
            full_name: acc.fullName,
          },
        }
      );

      if (updateError) {
        console.error(`Failed to update ${acc.email}:`, updateError.message);
        continue;
      }
      userId = updated.user.id;
    } else {
      console.log(`Creating new user: ${acc.email} (${acc.role})...`);
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: {
          role: acc.role,
          full_name: acc.fullName,
        },
      });

      if (createError) {
        console.error(`Failed to create ${acc.email}:`, createError.message);
        continue;
      }
      userId = created.user.id;
    }

    // Upsert into `profiles` table
    try {
      const { error: profileError } = await admin.from("profiles").upsert({
        id: userId,
        full_name: acc.fullName,
        phone: acc.phone,
      });

      if (profileError) {
        console.warn(`Profile upsert notice for ${acc.email}:`, profileError.message);
      } else {
        console.log(`✓ Profile synced for ${acc.email}`);
      }
    } catch (err) {
      console.warn(`Profile upsert error for ${acc.email}:`, err.message);
    }

    // If doctor, ensure doctor record exists in `doctors` table
    if (acc.role === "doctor") {
      try {
        const { data: doctorList } = await admin
          .from("doctors")
          .select("id, name")
          .ilike("name", `%${acc.fullName}%`);

        if (!doctorList || doctorList.length === 0) {
          const { error: docInsertError } = await admin.from("doctors").insert({
            name: acc.fullName,
            specialization: acc.specialization || "General Medicine",
          });
          if (docInsertError) {
            console.warn("Notice inserting doctor directory entry:", docInsertError.message);
          } else {
            console.log(`✓ Added doctor record into 'doctors' table for ${acc.fullName}`);
          }
        }
      } catch (err) {
        console.warn("Notice checking doctors table:", err.message);
      }
    }

    // Verify login with anon client
    const { data: loginData, error: loginErr } = await anon.auth.signInWithPassword({
      email: acc.email,
      password: acc.password,
    });

    if (loginErr) {
      console.error(`❌ Verification login failed for ${acc.email}:`, loginErr.message);
    } else {
      console.log(`✅ Verified login successful for ${acc.email} (${acc.role})`);
    }
  }

  console.log("\n=== Ensuring Sample Active Appointments Exist ===");
  try {
    const patientUser = existingUsers.find(u => u.email === "patient@example.com") || usersData?.users?.find(u => u.email === "patient@example.com");
    const { data: docList } = await admin.from("doctors").select("id, name").limit(1);
    const doctorRecord = docList?.[0];

    if (patientUser && doctorRecord) {
      const { data: existingAppts } = await admin.from("appointments").select("id").limit(1);
      if (!existingAppts || existingAppts.length === 0) {
        const todayStr = new Date().toISOString().split("T")[0];
        const { error: apptError } = await admin.from("appointments").insert({
          patient_id: patientUser.id,
          doctor_id: doctorRecord.id,
          appointment_date: todayStr,
          start_time: "09:00",
          end_time: "10:00",
          reason: "Routine health review and consultation",
          status: "Confirmed",
          consultation_fee: 500,
          waiting_time: 15
        });
        if (apptError) {
          console.warn("Notice inserting sample appointment:", apptError.message);
        } else {
          console.log("✓ Successfully seeded sample active appointment for testing.");
        }
      } else {
        console.log("✓ Appointments already exist in database.");
      }
    }
  } catch (err) {
    console.warn("Sample appointment seeding notice:", err.message);
  }

  console.log("\n=== Demo Accounts Ready ===");
  console.log("Patient : patient@example.com / admin123");
  console.log("Doctor  : doctor@example.com  / admin123");
  console.log("Admin   : admin@example.com   / admin123");
}

seedAccounts().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
