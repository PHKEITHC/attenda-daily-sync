const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = {
  query: (text, params) => pool.query(text, params),
  init: async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    // Per-user attendance (for students marking themselves)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status TEXT,
        created_at TIMESTAMP DEFAULT now(),
        UNIQUE(user_id, date)
      );
    `);

    // Attendance sessions created by teachers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id SERIAL PRIMARY KEY,
        class_id TEXT,
        session_date DATE NOT NULL,
        teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        submitted_at TIMESTAMP DEFAULT now()
      );
    `);

    // Attendance records linked to sessions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES attendance_sessions(id) ON DELETE CASCADE,
        class_id TEXT,
        student_id TEXT,
        student_name TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    // Notifications (simple store)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT,
        message TEXT,
        data JSONB,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
  }
};
