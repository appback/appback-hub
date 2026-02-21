module.exports = {
  githubClientId: process.env.GITHUB_CLIENT_ID,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
  githubCallbackUrl: process.env.GITHUB_CALLBACK_URL || 'https://appback.app/api/v1/auth/github/callback',
  jwtSecret: process.env.JWT_SECRET,
  allowedRedirects: [
    'https://titleclash.com',
    'https://clash.appback.app',
    'https://appback.app'
  ]
};
