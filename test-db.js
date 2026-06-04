const { Client } = require('pg');

async function test() {
  const configs = [
    {
      name: 'Pooler 6543 project-ref user',
      host: 'aws-0-ap-south-1.pooler.supabase.com',
      port: 6543,
      user: 'postgres.vednmmjioipjimlsjdmz',
      password: '"@Allah"786.'
    },
    {
      name: 'Pooler 6543 postgres user',
      host: 'aws-0-ap-south-1.pooler.supabase.com',
      port: 6543,
      user: 'postgres',
      password: '"@Allah"786.'
    },
    {
      name: 'Pooler 6543 vednmmj user',
      host: 'aws-0-ap-south-1.pooler.supabase.com',
      port: 6543,
      user: 'vednmmjioipjimlsjdmz',
      password: '"@Allah"786.'
    },
    {
      name: 'Pooler 5432 project-ref user',
      host: 'aws-0-ap-south-1.pooler.supabase.com',
      port: 5432,
      user: 'postgres.vednmmjioipjimlsjdmz',
      password: '"@Allah"786.'
    },
    {
      name: 'Direct DB IPv4',
      host: 'db.vednmmjioipjimlsjdmz.supabase.co',
      port: 5432,
      user: 'postgres',
      password: '"@Allah"786.'
    },
    {
      name: 'Pooler 6543 password no quotes',
      host: 'aws-0-ap-south-1.pooler.supabase.com',
      port: 6543,
      user: 'postgres.vednmmjioipjimlsjdmz',
      password: '@Allah786.'
    }
  ];

  for (const cfg of configs) {
    process.stdout.write(`Trying: ${cfg.name}... `);
    const client = new Client({
      host: cfg.host,
      port: cfg.port,
      database: 'postgres',
      user: cfg.user,
      password: cfg.password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000
    });
    try {
      await client.connect();
      const res = await client.query('SELECT current_database(), current_user');
      console.log(`SUCCESS! DB=${res.rows[0].current_database} User=${res.rows[0].current_user}`);
      // Try to list tables
      const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
      console.log(`Tables found: ${tables.rows.map(r => r.table_name).join(', ')}`);
      await client.end();
      return;
    } catch(err) {
      console.log(err.message.substring(0, 60));
      try { await client.end(); } catch {}
    }
  }
  console.log('\nAll failed.');
}
test();
