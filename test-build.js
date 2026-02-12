const { build } = require('next/dist/build');
const path = require('path');

(async () => {
  try {
    await build(path.resolve('.'), null, {
      debug: true
    });
  } catch (error) {
    console.error('Build error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();
