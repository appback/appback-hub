const pool = require('../../db');

exports.stats = async (req, res, next) => {
  try {
    const [agents, services, transactions, totalBalance] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM agents'),
      pool.query('SELECT COUNT(*) FROM services'),
      pool.query('SELECT COUNT(*) FROM transactions'),
      pool.query('SELECT COALESCE(SUM(balance), 0) as total FROM agents')
    ]);

    res.json({
      stats: {
        total_agents: parseInt(agents.rows[0].count),
        total_services: parseInt(services.rows[0].count),
        total_transactions: parseInt(transactions.rows[0].count),
        total_balance_in_circulation: Number(totalBalance.rows[0].total)
      }
    });
  } catch (err) {
    next(err);
  }
};
