/**
 * Seed script — creates demo Supabase Auth accounts + matching `users`
 * table rows, so you can demo the app without clicking through the
 * Supabase dashboard by hand.
 *
 * This uses the service role key, which has full admin access — never
 * bundle this key or this file inside the mobile app. It only ever runs
 * on your own computer.
 *
 * SETUP (one-time):
 * 1. Supabase Dashboard -> Project Settings -> API
 * 2. Copy "Project URL" and the "service_role" secret key (NOT the anon key)
 * 3. Paste them into the two constants below, or set them as environment
 *    variables SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY before running.
 *
 * RUN:
 *   cd scripts
 *   npm install
 *   npm run seed
 *
 * All demo accounts use the password: Passw0rd!
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://XXXXX.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "YOUR_SERVICE_ROLE_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = "Passw0rd!";

const lecturers = [
  {
    email: "janewanjiru@mut.ac.ke",
    fullName: "Dr. Jane Wanjiru",
    staffNo: "MUT-STF-044",
    department: "Computer Science",
    courses: ["SCS302", "SIT309"],
  },
  {
    email: "peterkamau@mut.ac.ke",
    fullName: "Mr. Peter Kamau",
    staffNo: "MUT-STF-051",
    department: "Computer Science",
    courses: ["SIT305", "SIT304"],
  },
];

const students = [
  {
    email: "johnmwangi@students.mut.ac.ke",
    fullName: "John Mwangi",
    regNo: "SC201/0123/21",
    department: "Computer Science",
    courses: ["SCS302", "SIT309", "SIT305"],
  },
  {
    email: "maryatieno@students.mut.ac.ke",
    fullName: "Mary Atieno",
    regNo: "SC201/0098/21",
    department: "Computer Science",
    courses: ["SCS302", "SIT309", "SIT305"],
  },
  {
    email: "kibetkiplangat@students.mut.ac.ke",
    fullName: "Kibet Kiplangat",
    regNo: "SC201/0150/21",
    department: "Computer Science",
    courses: ["SCS302", "SIT304", "SIT305"],
  },
  {
    email: "gracenjeri@students.mut.ac.ke",
    fullName: "Grace Njeri",
    regNo: "SC201/0077/21",
    department: "Computer Science",
    courses: ["SIT309", "SIT304"],
  },
];

async function upsertAuthUser(email) {
  // Try creating; if the user already exists, look them up instead.
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });

  if (!error) {
    console.log(`Created auth user: ${email}`);
    return created.user.id;
  }

  if (error.message.includes("already been registered") || error.status === 422) {
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list.users.find((u) => u.email === email);
    if (existing) {
      console.log(`Auth user already exists, reusing: ${email}`);
      return existing.id;
    }
  }

  throw error;
}

async function seedGroup(group, role) {
  for (const person of group) {
    const id = await upsertAuthUser(person.email);

    const { error } = await supabase.from("users").upsert({
      id,
      role,
      full_name: person.fullName,
      email: person.email,
      reg_no: person.regNo || null,
      staff_no: person.staffNo || null,
      department: person.department,
      courses: person.courses,
    });

    if (error) throw error;
    console.log(`  -> users row written (${role}): ${person.email}`);
  }
}

async function main() {
  console.log("Seeding lecturers...");
  await seedGroup(lecturers, "lecturer");

  console.log("\nSeeding students...");
  await seedGroup(students, "student");

  console.log("\nDone. All demo accounts use the password:", DEMO_PASSWORD);
  console.log("Example login: jane.wanjiru@mut.ac.ke /", DEMO_PASSWORD);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
