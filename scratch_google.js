const https = require('https');

function translate(text) {
  return new Promise((resolve, reject) => {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fa&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // Format is typically: [[[translation, original, ...], ...]]
          const translation = parsed[0].map(item => item[0]).join('');
          resolve(translation);
        } catch (e) {
          reject(new Error("Failed to parse response: " + data));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

translate("پروژه رو ببین میخوام کاملش کنم.")
  .then(res => console.log("Result:", res))
  .catch(err => console.error("Error:", err));
