const pool = require('./src/db');
pool.query('ALTER TABLE history ADD COLUMN backdrop_url VARCHAR;')
  .then(() => { console.log('Colonna aggiunta'); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
