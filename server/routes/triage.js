import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { computeAutomatedTriageLevel, TRIAGE_LABELS } from '../lib/triageLogic.js';
import { logAudit } from '../db/audit.js';

const router = Router();

router.post('/submit', requireAuth, requireRole('patient'), async (req, res) => {
  try {
    const { demographics, chief_complaint, symptoms, self_reported_urgency } = req.body;
    const patientId = req.userId;
    const automatedLevel = computeAutomatedTriageLevel({
      self_reported_urgency: self_reported_urgency ?? 5,
      symptoms: Array.isArray(symptoms) ? symptoms : [],
      chief_complaint: chief_complaint || '',
    });
    const { rows } = await pool.query(
      `INSERT INTO triage_cases (patient_id, demographics, chief_complaint, symptoms, self_reported_urgency, automated_triage_level, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'submitted')
       RETURNING id, patient_id, demographics, chief_complaint, symptoms, self_reported_urgency, automated_triage_level, final_triage_level, status, submitted_at`,
      [
        patientId,
        JSON.stringify(demographics || {}),
        chief_complaint || null,
        JSON.stringify(Array.isArray(symptoms) ? symptoms : []),
        self_reported_urgency ?? null,
        automatedLevel,
      ]
    );
    const case_ = rows[0];
    await logAudit({ userId: patientId, action: 'triage_submit', resourceType: 'triage_case', resourceId: case_.id, details: { automated_triage_level: automatedLevel } });
    res.status(201).json({
      ...case_,
      triage_label: TRIAGE_LABELS[case_.automated_triage_level],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/levels', (_, res) => res.json(TRIAGE_LABELS));

export { router as triageRouter };
