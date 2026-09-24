import { createPerson, setLoginEmail } from "../src/lib/commands";
import { loadTenantState, saveTenantState } from "../src/lib/server/persist";
import { overlaySessionIdentity } from "../src/lib/session-identity";
import type { AppState } from "../src/lib/types";

const today = new Date().toISOString().slice(0, 10);

const existing: { personId: string; email: string; sheetName: string }[] = [
  { personId: "person-alvin", email: "alvin@kmplus.co.id", sheetName: "Alvin Soleh" },
  { personId: "person-rayhan", email: "rayhan@kmplus.co.id", sheetName: "Muhammad Rayhan" },
  { personId: "person-puti", email: "puti@kmplus.co.id", sheetName: "Puti Cut" },
  { personId: "person-nabila", email: "nabilamaharani@kmplus.co.id", sheetName: "Nabila Maharani Naumi" },
  { personId: "person-pinkan", email: "pinkan.fadhilah@kmplus.co.id", sheetName: "Pinkan Fadhilah" },
  { personId: "person-marcelino", email: "marcelino@kmplus.co.id", sheetName: "M. Marcelino" },
  { personId: "person-setyo", email: "setyo.adi@kmplus.co.id", sheetName: "M. Setyo Adi" },
  { personId: "person-eka", email: "akhmad.eka@kmplus.co.id", sheetName: "Akhmad Eka" },
  { personId: "person-irfan", email: "irfan.widyatmoko@kmplus.co.id", sheetName: "Irfan Alfieri" },
  { personId: "person-raafi", email: "ahmad.raafi@kmplus.co.id", sheetName: "Ahmad Raafi" },
  { personId: "person-fadhylah", email: "fadhylah@kmplus.co.id", sheetName: "Fadhylah Chayrina" },
  { personId: "person-alfredo", email: "alfredoteja@kmplus.co.id", sheetName: "Alfredo Teja" },
  { personId: "person-digit", email: "digit.praktika@kmplus.co.id", sheetName: "Digit Praktika" },
  { personId: "person-imanuella", email: "imanuella@kmplus.co.id", sheetName: "Imanuella" },
  { personId: "person-sakinah", email: "sakinah@kmplus.co.id", sheetName: "Sakinah" },
  { personId: "person-wisnu", email: "wisnubaskoro@kmplus.co.id", sheetName: "Wisnu" },
];

const missing: { legalName: string; email: string }[] = [
  { legalName: "Farhan Haryawan", email: "farhan.haryawan@kmplus.co.id" },
  { legalName: "Fikri Suryana", email: "fikri.suryana@kmplus.co.id" },
  { legalName: "Meicha Ningtyas", email: "meicha.wibowo@kmplus.co.id" },
  { legalName: "Wawan Gunawan", email: "wawan.gunawan@kmplus.co.id" },
];

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  let state: AppState = overlaySessionIdentity(await loadTenantState(), {
    personId: "person-denny",
    role: "hr",
  });

  for (const row of missing) {
    const found = state.people.find((person) => person.legalName.toLowerCase() === row.legalName.toLowerCase());
    if (found) {
      existing.push({ personId: found.id, email: row.email, sheetName: row.legalName });
      continue;
    }
    const created = createPerson(state, {
      legalName: row.legalName,
      preferredName: row.legalName.split(" ")[0] ?? row.legalName,
      email: row.email,
      phone: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      joinDate: today,
      status: "active",
      contractType: "permanent",
    });
    if (!created.personId) fail(`Could not create ${row.legalName}`);
    state = created.state;
    existing.push({ personId: created.personId, email: row.email, sheetName: row.legalName });
    console.log(`created ${row.legalName}`);
  }

  for (const row of existing) {
    const person = state.people.find((item) => item.id === row.personId);
    if (!person) fail(`Missing person ${row.personId} for ${row.sheetName}`);
    const result = setLoginEmail(state, row.personId, row.email);
    if (result.error) fail(`${row.sheetName}: ${result.error}`);
    state = result.state;
    console.log(`${row.sheetName} -> ${row.email}`);
  }

  await saveTenantState(state);
  console.log(`Registered ${existing.length} corporate login emails.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
