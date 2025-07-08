module.exports = {
  buildPlugins: [
    {
      name: 'add-headers',
      async onPreBuild({ utils }) {
        await utils.status.show({ summary: 'Adding security headers' });
      },
    },
  ],
  headers: {
    '/*': [
      'X-Frame-Options: DENY',
      'X-Content-Type-Options: nosniff',
      'Referrer-Policy: strict-origin-when-cross-origin',
    ],
    '/assets/*': [
      'Cache-Control: public',
      'Cache-Control: max-age=31536000',
      'Cache-Control: immutable',
    ],
  },
};
