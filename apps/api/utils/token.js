const { generateToken, hashToken } = require('../../../../packages/common/token');

function generateAgentToken() {
  return generateToken('aw_agent_');
}

function generateServiceKey() {
  return generateToken('aw_service_');
}

module.exports = { generateAgentToken, generateServiceKey, hashToken };
