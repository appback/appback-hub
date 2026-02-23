const https = require('https');
const jwt = require('jsonwebtoken');
const pool = require('../../db');
const config = require('../../config');
const { BadRequestError } = require('../../utils/errors');
const bonusService = require('../../services/bonusService');

function httpsRequest(url, options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          reject(new Error('Failed to parse response'));
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

exports.githubRedirect = (req, res) => {
  const { redirect } = req.query;

  if (!config.githubClientId) {
    throw new BadRequestError('GitHub OAuth not configured');
  }

  // Validate redirect URL
  let finalRedirect = 'https://appback.app';
  if (redirect) {
    const allowed = config.allowedRedirects.some(u => redirect.startsWith(u));
    if (allowed) {
      finalRedirect = redirect;
    }
  }

  const state = Buffer.from(JSON.stringify({ redirect: finalRedirect })).toString('base64url');

  const params = new URLSearchParams({
    client_id: config.githubClientId,
    redirect_uri: config.githubCallbackUrl,
    scope: 'read:user user:email',
    state
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
};

exports.googleRedirect = (req, res) => {
  const { redirect } = req.query;

  if (!config.googleClientId) {
    throw new BadRequestError('Google OAuth not configured');
  }

  let finalRedirect = 'https://appback.app';
  if (redirect) {
    const allowed = config.allowedRedirects.some(u => redirect.startsWith(u));
    if (allowed) finalRedirect = redirect;
  }

  const state = Buffer.from(JSON.stringify({ redirect: finalRedirect })).toString('base64url');

  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: config.googleCallbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

exports.googleCallback = async (req, res, next) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      throw new BadRequestError('Missing authorization code');
    }

    // Exchange code for tokens
    const tokenPayload = new URLSearchParams({
      code,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: config.googleCallbackUrl,
      grant_type: 'authorization_code'
    }).toString();

    const tokenRes = await httpsRequest('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(tokenPayload)
      }
    }, tokenPayload);

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) {
      throw new BadRequestError('Failed to get access token from Google');
    }

    // Get user info
    const userRes = await httpsRequest('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    const gUser = userRes.data;
    const email = gUser.email;
    const googleId = String(gUser.id);

    // Find or create user
    let user;
    const { rows: existing } = await pool.query(
      'SELECT * FROM users WHERE google_id = $1', [googleId]
    );

    if (existing.length > 0) {
      user = existing[0];
      await pool.query(
        'UPDATE users SET avatar_url = COALESCE($1, avatar_url) WHERE id = $2',
        [gUser.picture, user.id]
      );
      user.avatar_url = gUser.picture || user.avatar_url;
    } else {
      // Check if email already exists (merge accounts)
      if (email) {
        const { rows: emailMatch } = await pool.query(
          'SELECT * FROM users WHERE email = $1', [email]
        );
        if (emailMatch.length > 0) {
          user = emailMatch[0];
          await pool.query(
            'UPDATE users SET google_id = $1, avatar_url = COALESCE(avatar_url, $2), display_name = COALESCE(display_name, $3) WHERE id = $4',
            [googleId, gUser.picture, gUser.name, user.id]
          );
          user.google_id = googleId;
        }
      }

      if (!user) {
        const { rows: [newUser] } = await pool.query(
          `INSERT INTO users (email, google_id, avatar_url, display_name, role)
           VALUES ($1, $2, $3, $4, 'player')
           RETURNING *`,
          [email, googleId, gUser.picture, gUser.name]
        );
        user = newUser;
        bonusService.grantSignupBonus(user.id);
      }
    }

    // Issue JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        displayName: user.display_name
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Parse redirect from state
    let redirectUrl = 'https://appback.app';
    if (state) {
      try {
        const parsed = JSON.parse(Buffer.from(state, 'base64url').toString());
        if (parsed.redirect) {
          const allowed = config.allowedRedirects.some(u => parsed.redirect.startsWith(u));
          if (allowed) redirectUrl = parsed.redirect;
        }
      } catch {
        // ignore bad state
      }
    }

    const separator = redirectUrl.includes('?') ? '&' : '?';
    res.redirect(`${redirectUrl}${separator}token=${token}`);
  } catch (err) {
    next(err);
  }
};

exports.githubCallback = async (req, res, next) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      throw new BadRequestError('Missing authorization code');
    }

    // Exchange code for access_token
    const tokenPayload = JSON.stringify({
      client_id: config.githubClientId,
      client_secret: config.githubClientSecret,
      code
    });

    const tokenRes = await httpsRequest('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(tokenPayload)
      }
    }, tokenPayload);

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) {
      throw new BadRequestError('Failed to get access token from GitHub');
    }

    // Get user info
    const userRes = await httpsRequest('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'appback-hub',
        'Accept': 'application/json'
      }
    });

    const ghUser = userRes.data;

    // Get primary email if not public
    let email = ghUser.email;
    if (!email) {
      const emailRes = await httpsRequest('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'appback-hub',
          'Accept': 'application/json'
        }
      });
      const primary = emailRes.data.find(e => e.primary && e.verified);
      email = primary ? primary.email : null;
    }

    // Find or create user
    let user;
    const { rows: existing } = await pool.query(
      'SELECT * FROM users WHERE github_id = $1',
      [ghUser.id]
    );

    if (existing.length > 0) {
      user = existing[0];
      // Update avatar and username on each login
      await pool.query(
        'UPDATE users SET avatar_url = $1, github_username = $2 WHERE id = $3',
        [ghUser.avatar_url, ghUser.login, user.id]
      );
      user.avatar_url = ghUser.avatar_url;
      user.github_username = ghUser.login;
    } else {
      // Check if email already exists (merge accounts)
      if (email) {
        const { rows: emailMatch } = await pool.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );
        if (emailMatch.length > 0) {
          user = emailMatch[0];
          await pool.query(
            'UPDATE users SET github_id = $1, github_username = $2, avatar_url = $3, display_name = COALESCE(display_name, $4) WHERE id = $5',
            [ghUser.id, ghUser.login, ghUser.avatar_url, ghUser.name || ghUser.login, user.id]
          );
          user.github_id = ghUser.id;
          user.github_username = ghUser.login;
          user.avatar_url = ghUser.avatar_url;
        }
      }

      if (!user) {
        // Create new user
        const { rows: [newUser] } = await pool.query(
          `INSERT INTO users (email, github_id, github_username, avatar_url, display_name, role)
           VALUES ($1, $2, $3, $4, $5, 'player')
           RETURNING *`,
          [email, ghUser.id, ghUser.login, ghUser.avatar_url, ghUser.name || ghUser.login]
        );
        user = newUser;

        // Fire-and-forget signup bonus
        bonusService.grantSignupBonus(user.id);
      }
    }

    // Issue JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        displayName: user.display_name
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Parse redirect from state
    let redirectUrl = 'https://appback.app';
    if (state) {
      try {
        const parsed = JSON.parse(Buffer.from(state, 'base64url').toString());
        if (parsed.redirect) {
          const allowed = config.allowedRedirects.some(u => parsed.redirect.startsWith(u));
          if (allowed) redirectUrl = parsed.redirect;
        }
      } catch {
        // ignore bad state
      }
    }

    // Redirect with token in hash fragment
    const separator = redirectUrl.includes('?') ? '&' : '?';
    res.redirect(`${redirectUrl}${separator}token=${token}`);
  } catch (err) {
    next(err);
  }
};
