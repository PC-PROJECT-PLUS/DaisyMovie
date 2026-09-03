const fs = require('fs');
let content = fs.readFileSync('backend/src/routes/movies.js', 'utf8');

if (!content.includes('const cache = new Map();')) {
    content = content.replace('const router = express.Router();', 'const router = express.Router();\n\nconst cache = new Map();\nconst CACHE_TTL = 1000 * 60 * 5; // 5 minutes');
    
    const tryBlockStart = 'router.get(\'/home\', async (req, res) => {\n  try {\n    const category = req.query.category || \\'\\';';
    const cacheLogic = outer.get('/home', async (req, res) => {
  try {
    const category = req.query.category || '';
    if (cache.has(category)) {
      const cached = cache.get(category);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
      }
    };
    content = content.replace(tryBlockStart, cacheLogic);
    
    const sendLogic =     res.json({\n      heroMovies,;
    const newSendLogic =     const responseData = {\n      heroMovies,;
    content = content.replace(sendLogic, newSendLogic);
    
    const catchLogic =     });\n  } catch (error) {;
    const newCatchLogic =     };\n    cache.set(category, { timestamp: Date.now(), data: responseData });\n    res.json(responseData);\n  } catch (error) {;
    content = content.replace(catchLogic, newCatchLogic);
    
    fs.writeFileSync('backend/src/routes/movies.js', content);
    console.log('Cache added');
}
