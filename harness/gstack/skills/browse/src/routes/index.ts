/**
 * The browse daemon's route table, in dispatch order. See ./table.ts for the
 * entry shape, auth kinds and the unmatched fallthrough.
 */

import type { RouteEntry } from './table';
import { pairingRoutes } from './pairing';
import { coreRoutes } from './core';
import { ptyRoutes } from './pty';
import { tokenRoutes } from './tokens';
import { tunnelRoutes } from './tunnel';
import { activityRoutes } from './activity';
import { commandRoutes } from './commands';
import { fileRoutes } from './files';
import { inspectorRoutes } from './inspector';

export const ROUTES: readonly RouteEntry[] = [
  ...pairingRoutes,
  ...coreRoutes,
  ...ptyRoutes,
  ...tokenRoutes,
  ...tunnelRoutes,
  ...activityRoutes,
  ...commandRoutes,
  ...fileRoutes,
  ...inspectorRoutes,
];
