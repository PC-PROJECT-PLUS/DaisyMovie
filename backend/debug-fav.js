const pool = require('./src/db');
Promise.all([
  pool.query("SELECT COUNT(*) as total FROM favorites"),
  pool.query("SELECT media_id, media_type, title FROM favorites WHERE media_id = 1386315"),
  pool.query("SELECT media_id, media_type, title FROM history"),
  pool.query("SELECT media_id, media_type, title FROM favorites")
]).then(([count, specific, hist, allFav]) => {
  console.log('Total favorites:', count.rows[0].total);
  console.log('\n=== MOVIE 1386315 IN FAVORITES? ===');
  console.log(specific.rows.length === 0 ? 'NO - not in favorites' : 'YES: ' + JSON.stringify(specific.rows));
  console.log('\n=== ALL HISTORY ===');
  hist.rows.forEach(r => console.log(`  ${r.media_type}_${r.media_id}  "${r.title}"`));
  console.log('\n=== ALL FAVORITES ===');
  allFav.rows.forEach(r => console.log(`  ${r.media_type}_${r.media_id}  "${r.title}"`));
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
