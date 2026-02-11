// app/database/schema.js
export const createTables = (db) => {
  if (!db) return;

  db.transaction((tx) => {
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
      );`,
    );
  });
};
