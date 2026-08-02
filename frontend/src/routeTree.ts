import { rootRoute } from './routes/__root';
import { indexRoute } from './routes/index';
import { loginRoute } from './routes/login';
import { entryDateRoute } from './routes/entry.$date';
import { summariesRoute } from './routes/summaries';
import { summaryRoute } from './routes/summary.$period.$year.$index';

export const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  entryDateRoute,
  summariesRoute,
  summaryRoute,
]);
