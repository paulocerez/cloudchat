import { createContext, useContext, useMemo, useState } from 'react';

interface PageTitleValue {
  /** The current page's heading, as registered by PageHeader. */
  title: string;
  /** True once the page's large title has scrolled out from under the nav. */
  compact: boolean;
  setTitle: (title: string) => void;
  setCompact: (compact: boolean) => void;
}

const noop = () => {};
const PageTitleContext = createContext<PageTitleValue>({
  title: '',
  compact: false,
  setTitle: noop,
  setCompact: noop,
});

/**
 * Lets the nav show the page's name without every route repeating it. The big
 * title stays in the page (iOS large-title style) and the nav picks it up only
 * once you've scrolled past it — which is also what stops the phone's top bar
 * from sitting there empty.
 */
export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState('');
  const [compact, setCompact] = useState(false);
  const value = useMemo(
    () => ({ title, compact, setTitle, setCompact }),
    [title, compact]
  );
  return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>;
}

export function usePageTitle(): PageTitleValue {
  return useContext(PageTitleContext);
}
