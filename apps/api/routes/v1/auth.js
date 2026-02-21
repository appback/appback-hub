const { Router } = require('express');
const authController = require('../../controllers/v1/auth');
const oauthController = require('../../controllers/v1/oauth');
const jwtAuth = require('../../middleware/jwtAuth');

const router = Router();

// Email/password auth
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', jwtAuth, authController.me);
router.post('/verify', authController.verify);

// GitHub OAuth
router.get('/github', oauthController.githubRedirect);
router.get('/github/callback', oauthController.githubCallback);

module.exports = router;
