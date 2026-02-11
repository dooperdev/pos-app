export const logActivity = async (db, user, action, details = "") => {
  try {
    await db.runAsync(
      `INSERT INTO ActivityLogs 
       (UserID, Action, Description)
       VALUES (?, ?, ?)`,
      [user?.UserID ?? null, action, details, new Date().toISOString()],
    );
  } catch (error) {
    console.error("Activity log failed:", error);
  }
};
