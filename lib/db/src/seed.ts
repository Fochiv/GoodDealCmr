import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { operatorsTable, bundlesTable } from "./schema/index.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL manquant");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function seed() {
  console.log("🌱 Démarrage du seed...");

  await db.delete(bundlesTable);
  await db.delete(operatorsTable);
  console.log("🗑️  Tables vidées");

  const [mtn, orange] = await db
    .insert(operatorsTable)
    .values([
      { name: "MTN Cameroon", slug: "mtn", color: "#FFD700", logoUrl: "/logo-mtn.png", active: true },
      { name: "Orange Cameroun", slug: "orange", color: "#FF6B00", logoUrl: "/logo-orange.jpg", active: true },
    ])
    .returning();

  console.log(`✅ Opérateurs créés — MTN id=${mtn.id}, Orange id=${orange.id}`);

  const mtnBundles = [
    { name: "Start MTN",      dataSize: "8 Go",  validity: 30, price: 1000,  operatorId: mtn.id, active: true },
    { name: "Boost MTN",      dataSize: "3 Go",  validity: 7,  price: 500,   operatorId: mtn.id, active: true },
    { name: "Plus MTN",       dataSize: "20 Go", validity: 30, price: 2000,  operatorId: mtn.id, active: true },
    { name: "Max MTN",        dataSize: "40 Go", validity: 30, price: 3500,  operatorId: mtn.id, active: true },
    { name: "Maxi MTN",       dataSize: "70 Go", validity: 30, price: 5000,  operatorId: mtn.id, active: true },
  ];

  const orangeBundles = [
    { name: "Fly Orange",     dataSize: "800 Mo",  validity: 3,  price: 200,   operatorId: orange.id, active: true },
    { name: "Start Orange",   dataSize: "8 Go",    validity: 30, price: 1000,  operatorId: orange.id, active: true },
    { name: "Easy Orange",    dataSize: "3 Go",    validity: 7,  price: 500,   operatorId: orange.id, active: true },
    { name: "Connect Orange", dataSize: "12 Go",   validity: 30, price: 1500,  operatorId: orange.id, active: true },
    { name: "Plus Orange",    dataSize: "18 Go",   validity: 30, price: 2000,  operatorId: orange.id, active: true },
    { name: "Max Orange",     dataSize: "30 Go",   validity: 30, price: 3000,  operatorId: orange.id, active: true },
    { name: "Maxi Orange",    dataSize: "60 Go",   validity: 30, price: 5000,  operatorId: orange.id, active: true },
  ];

  await db.insert(bundlesTable).values([...mtnBundles, ...orangeBundles]);
  console.log(`✅ ${mtnBundles.length} forfaits MTN + ${orangeBundles.length} forfaits Orange insérés`);

  await pool.end();
  console.log("✅ Seed terminé !");
}

seed().catch(e => { console.error("❌ Erreur seed:", e); process.exit(1); });
