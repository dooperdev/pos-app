// app/database/index.js
import React, { createContext, useContext } from "react";
import {
  SQLiteProvider as ExpoSQLiteProvider,
  useSQLiteContext as useExpoSQLiteContext,
} from "expo-sqlite";
import { createTables } from "./schema";

// Optional: create your own wrapper context to add custom helpers
const SQLiteContext = createContext(null);
export const useSQLiteContext = () => useContext(SQLiteContext);

export const SQLiteProvider = ({ children }) => {
  // We wrap Expo's SQLiteProvider to add async helpers
  return (
    <ExpoSQLiteProvider
      databaseName="pos.db"
      options={{ useNewConnection: false }}
      onInit={async (db) => {
        // Create tables on initialization
        await createTables(db);

        // Add custom async helper functions to db
        db.runAsync = (sql, params = []) =>
          new Promise((resolve, reject) => {
            db.execAsync(sql, params).then(resolve).catch(reject);
          });

        db.getAllAsync = (sql, params = []) =>
          new Promise((resolve, reject) => {
            db.execAsync(sql, params)
              .then(({ rows }) => resolve(rows._array || []))
              .catch(reject);
          });

        return db;
      }}
    >
      {/* Provide the db with async helpers through our custom context */}
      <InnerProvider>{children}</InnerProvider>
    </ExpoSQLiteProvider>
  );
};

// InnerProvider gets the db from Expo's context and exposes it with async helpers
const InnerProvider = ({ children }) => {
  const db = useExpoSQLiteContext();
  return <SQLiteContext.Provider value={db}>{children}</SQLiteContext.Provider>;
};
