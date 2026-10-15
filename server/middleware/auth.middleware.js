import { supabaseAdmin } from '../utils/supabaseAdmin.js';
import { logger } from '../utils/logger.js';
import { resolveAccessContext } from '../../shared/authorization.js';

/** Verify identity and resolve fresh database grants on every protected request. */
export const createVerifyToken = (supabase) => async (req, res, next) => {
  const token = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '')?.[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: 'Unauthorized' });
    const { data: access, error: accessError } = await supabase.rpc('get_access_context', { subject: data.user.id });
    if (accessError) {
      logger.error('Access context unavailable:', accessError.message);
      return res.status(503).json({ error: 'Access verification unavailable' });
    }
    const resolved = resolveAccessContext(access, data.user.id);
    if (!resolved) {
      return res.status(403).json({ error: 'Account has no active access' });
    }
    req.user = { id: data.user.id, email: data.user.email, ...resolved };
    next();
  } catch (error) {
    logger.error('Authentication service unavailable:', error.message);
    res.status(503).json({ error: 'Access verification unavailable' });
  }
};
export const verifyToken = createVerifyToken(supabaseAdmin);

/** Capability checks do not replace resource ownership/scope checks. */
export const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.user.permissions.includes(permission)) return res.status(403).json({ error: 'Forbidden' });
  next();
};
export const requireOwner = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.id !== req.params.userId) return res.status(403).json({ error: 'Forbidden' });
  next();
};
