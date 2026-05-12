import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL manquant");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    console.log("🌱 Démarrage du seed...");

    await client.query("DELETE FROM bundles");
    await client.query("DELETE FROM operators");
    console.log("🗑️  Tables vidées");

    const opsRes = await client.query(`
      INSERT INTO operators (name, slug, color, logo_url, active)
      VALUES
        ('MTN Cameroon',   'mtn',    '#FFD700', '/logo-mtn.png',   true),
        ('Orange Cameroun','orange', '#FF6B00', '/logo-orange.jpg', true)
      RETURNING id, slug
    `);

    const mtnId    = opsRes.rows.find(r => r.slug === "mtn").id;
    const orangeId = opsRes.rows.find(r => r.slug === "orange").id;
    console.log(`✅ Opérateurs créés — MTN id=${mtnId}, Orange id=${orangeId}`);

    await client.query(`
      INSERT INTO bundles (name, data_size, validity, price, operator_id, active)
      VALUES
        ('Start MTN',  '8 Go',  30, 1000, ${mtnId}, true),
        ('Boost MTN',  '3 Go',  7,  500,  ${mtnId}, true),
        ('Plus MTN',   '20 Go', 30, 2000, ${mtnId}, true),
        ('Max MTN',    '40 Go', 30, 3500, ${mtnId}, true),
        ('Maxi MTN',   '70 Go', 30, 5000, ${mtnId}, true)
    `);
    console.log("✅ 5 forfaits MTN insérés");

    await client.query(`
      INSERT INTO bundles (name, data_size, validity, price, operator_id, active)
      VALUES
        ('Fly Orange',     '800 Mo', 3,  200,  ${orangeId}, true),
        ('Start Orange',   '8 Go',   30, 1000, ${orangeId}, true),
        ('Easy Orange',    '3 Go',   7,  500,  ${orangeId}, true),
        ('Connect Orange', '12 Go',  30, 1500, ${orangeId}, true),
        ('Plus Orange',    '18 Go',  30, 2000, ${orangeId}, true),
        ('Max Orange',     '30 Go',  30, 3000, ${orangeId}, true),
        ('Maxi Orange',    '60 Go',  30, 5000, ${orangeId}, true)
    `);
    console.log("✅ 7 forfaits Orange insérés");

    console.log("✅ Seed terminé !");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(e => { console.error("❌ Erreur seed:", e); process.exit(1); });
