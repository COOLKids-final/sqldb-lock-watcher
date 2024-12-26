const sql = require('mssql');

async function queryDatabase(query, dbConfig) {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(query);
    await pool.close();
    return result.recordset;
  } catch (err) {
    throw err;
  }
}

module.exports = queryDatabase;
