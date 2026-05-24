import { useEffect } from 'react';

export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta && description !== undefined) {
      meta.setAttribute('content', description);
    }
  }, [title, description]);
}
