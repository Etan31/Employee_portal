import express from 'express';
import { requirePermission } from '../middleware/auth.middleware.js';
import { supabaseAdmin } from '../utils/supabaseAdmin.js';
import { sendStaffInvitation } from '../services/invitations.service.js';

const router = express.Router();
router.post('/:staffId/send', requirePermission('account.invite'), async (req, res, next) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.staffId)
    || (req.body && Object.keys(req.body).length)) return res.status(400).json({ error: 'Provide a staff ID only.' });
  const redirectTo = process.env.INVITATION_REDIRECT_URL;
  if (!redirectTo) return res.status(503).json({ error: 'Invitation delivery is not configured.' });
  try {
    const url = new URL(redirectTo);
    if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.hostname === 'localhost')) {
      return res.status(503).json({ error: 'Invitation redirect is not configured securely.' });
    }
    const result = await sendStaffInvitation(supabaseAdmin, req.user.id, req.params.staffId, redirectTo);
    res.setHeader('Cache-Control', 'no-store');
    res.json(result);
  } catch (error) { next(error); }
});
export default router;
