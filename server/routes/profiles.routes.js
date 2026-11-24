import express from 'express';
import { requirePermission, requireOwner } from '../middleware/auth.middleware.js';
import { supabaseAdmin as supabase } from '../utils/supabaseAdmin.js';

const router = express.Router();
router.get('/me', requirePermission('profile.self'), (req, res) => res.json({ profile: req.user.profile, roles: req.user.roles }));
router.get('/:userId', requirePermission('profile.self'), requireOwner, (req, res) => res.json(req.user.profile));
router.put('/:userId', requirePermission('profile.self'), requireOwner, async (req, res, next) => {
  const allowed = ['first_name', 'last_name', 'avatar_url'];
  const body = req.body;
  if (!body || Array.isArray(body) || !Object.keys(body).length || Object.keys(body).some(key => !allowed.includes(key)) ||
    Object.entries(body).some(([key, value]) => value !== null && (typeof value !== 'string' || value.length > (key === 'avatar_url' ? 2048 : 100)))) {
    return res.status(400).json({ error: 'Provide only valid personal profile fields' });
  }
  try {
    const { data, error } = await supabase.from('profiles').update(body).eq('id', req.user.id).eq('is_active', true)
      .select('id, email, first_name, last_name, avatar_url').single();
    if (error) return res.status(400).json({ error: 'Profile could not be updated' });
    res.json(data);
  } catch (error) { next(error); }
});
// Account administration exposes account metadata only, never full HR profiles.
router.get('/', requirePermission('account.read'), async (req, res, next) => {
  try {
    const { data: staff, error: staffError } = await supabase.from('employees').select('company_id').eq('auth_user_id', req.user.id).single();
    if (staffError || !staff) return res.status(403).json({ error: 'Company membership required' });
    const { data, error } = await supabase.from('employees').select('auth_user_id, work_email, account_status').eq('company_id', staff.company_id).order('work_email');
    if (error) return res.status(503).json({ error: 'Accounts unavailable' });
    res.json(data.map(row => ({ id: row.auth_user_id, email: row.work_email, is_active: row.account_status === 'active' })));
  } catch (error) { next(error); }
});
export default router;
