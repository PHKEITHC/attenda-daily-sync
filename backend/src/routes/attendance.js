const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware');

// Per-user attendance (student marks themselves)
router.post('/', auth, async (req, res) => {
  const userId = req.user.id;
  const { date, status } = req.body || {};
  if (!date) return res.status(400).json({ error: 'date_required' });
  try {
    const inserted = await db.query(
      'INSERT INTO attendance (user_id, date, status) VALUES ($1, $2, $3) ON CONFLICT (user_id, date) DO UPDATE SET status = EXCLUDED.status RETURNING id, date, status, created_at',
      [userId, date, status || null]
    );
    res.json(inserted.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// List attendances for the authenticated user
router.get('/', auth, async (req, res) => {
  const userId = req.user.id;
  try {
    const q = await db.query('SELECT id, date, status, created_at FROM attendance WHERE user_id=$1 ORDER BY date DESC', [userId]);
    res.json(q.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Teacher: create a session and attendance records (bulk)
router.post('/session', auth, async (req, res) => {
  // teacher submits attendance for multiple students
  const teacherId = req.user.id;
  const { classId, sessionDate, records } = req.body || {};
  if (!classId || !sessionDate || !Array.isArray(records)) return res.status(400).json({ error: 'classId_sessionDate_records_required' });

  const client = await (async () => {
    const { Pool } = require('pg');
    return db._pool || null;
  })();

  try {
    // Create session
    const sessionRes = await db.query(
      'INSERT INTO attendance_sessions (class_id, session_date, teacher_id, submitted_at) VALUES ($1, $2, $3, now()) RETURNING id',
      [classId, sessionDate, teacherId]
    );
    const sessionId = sessionRes.rows[0].id;

    // Insert records
    const insertPromises = [];
    for (const r of records) {
      insertPromises.push(
        db.query(
          'INSERT INTO attendance_records (session_id, class_id, student_id, student_name, status) VALUES ($1, $2, $3, $4, $5)',
          [sessionId, classId, r.studentId, r.studentName, r.status]
        )
      );
    }
    await Promise.all(insertPromises);

    // Optionally create notifications for users if user_id known
    // records may include userId to target notifications
    const notifPromises = [];
    for (const r of records) {
      if (r.userId) {
        notifPromises.push(
          db.query(
            'INSERT INTO notifications (user_id, title, message, data) VALUES ($1, $2, $3, $4)',
            [r.userId, `Attendance: ${classId}`, `Your attendance for ${sessionDate} is ${r.status}`, JSON.stringify({ sessionId, classId, sessionDate, status: r.status })]
          )
        );
      }
    }
    await Promise.all(notifPromises);

    res.json({ sessionId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Teacher: list sessions for a class
router.get('/sessions/:classId', auth, async (req, res) => {
  const { classId } = req.params;
  try {
    const q = await db.query('SELECT id, class_id, session_date, teacher_id, submitted_at FROM attendance_sessions WHERE class_id=$1 ORDER BY session_date DESC', [classId]);
    res.json(q.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Teacher: get records for a session
router.get('/records/:sessionId', auth, async (req, res) => {
  const { sessionId } = req.params;
  try {
    const q = await db.query('SELECT id, session_id, class_id, student_id, student_name, status, created_at FROM attendance_records WHERE session_id=$1', [sessionId]);
    res.json(q.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  }
});

module.exports = router;
