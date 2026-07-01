const translate = require('@vitalets/google-translate-api');

async function test() {
  try {
    const res = await translate('سلام این یک تست است', { to: 'en' });
    console.log(res.text);
  } catch (err) {
    console.error(err);
  }
}

test();
