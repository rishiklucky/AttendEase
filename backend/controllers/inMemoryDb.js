// Global arrays for in-memory database fallback
export const studentsDb = [];
export const attendanceDb = [];

// Helper to clear db for testing if needed
export const clearDb = () => {
  studentsDb.length = 0;
  attendanceDb.length = 0;
};
