import { rootRoute } from './routes/__root';
import { indexRoute } from './routes/index';
import { loginRoute } from './routes/login';
import { entryDateRoute } from './routes/entry.$date';
import { calendarRoute } from './routes/calendar';
import { summariesRoute } from './routes/summaries';
import { summaryRoute } from './routes/summary.$period.$year.$index';

export const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  entryDateRoute,
  calendarRoute,
  summariesRoute,
  summaryRoute,
]);
