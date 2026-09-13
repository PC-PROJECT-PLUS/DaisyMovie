const pool = require('./src/db');
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='favorites'")
  .then(r => { console.log(JSON.stringify(r.rows)); process.exit(0); })
  .catch(e => { console.error(e.message); process.exit(1); });
