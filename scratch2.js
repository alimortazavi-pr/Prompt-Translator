async function test() {
  try {
    const googleTranslate = await import('@vitalets/google-translate-api');
    console.log("Keys:", Object.keys(googleTranslate));
    const translate = googleTranslate.translate || googleTranslate.default;
    const res = await translate('سلام این یک تست است', { to: 'en' });
    console.log("Translation:", res.text);
  } catch (err) {
    console.error(err);
  }
}

test();
