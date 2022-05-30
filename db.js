const sql = require("mysql2");

const connection = sql.createConnection({
  host: "localhost",
  user: "root",
  password: "mypass",
  database: "weather_bot_db",
});
console.log(connection);

connection.connect((err) => {
  if (err) throw err;
  console.log(connection);
});

module.exports;
