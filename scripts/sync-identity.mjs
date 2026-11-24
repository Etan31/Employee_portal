import '../server/env.js';
import { supabaseAdmin } from '../server/utils/supabaseAdmin.js';
import { syncIdentityAccounts } from '../server/services/identity-sync.service.js';
import { logger } from '../server/utils/logger.js';

try {
  const result = await syncIdentityAccounts(supabaseAdmin);
  logger.info(`Identity synchronization: ${result.completed}/${result.attempted} completed`);
  if (result.completed < result.attempted) process.exitCode = 1;
} catch (error) {
  logger.error(error.message); process.exitCode = 1;
}
