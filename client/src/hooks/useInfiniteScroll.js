import { useCallback, useRef, useEffect } from "react";

/**
 * Hook para manejar IntersectionObserver y scroll infinito
 *
 * @param {Function} loadMore - Función que se ejecuta cuando se necesita cargar más datos
 * @param {boolean} hasNextPage - Si hay más páginas disponibles
 * @param {boolean} isLoading - Si está cargando actualmente
 * @returns {Function} - Ref callback para el último elemento
 */
export const useInfiniteScroll = (loadMore, hasNextPage, isLoading) => {
  const observerRef = useRef();

  // Callback ref para el último elemento
  const lastElementRef = useCallback(
    (node) => {
      // No hacer nada si está cargando
      if (isLoading) return;

      // Desconectar observer anterior
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      // Crear nuevo observer
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage && !isLoading) {
            loadMore();
          }
        },
        {
          threshold: 0.1,
          rootMargin: "20px", // Comenzar a cargar 20px antes de llegar al elemento
        }
      );

      // Observar el nuevo nodo
      if (node) {
        observerRef.current.observe(node);
      }
    },
    [loadMore, hasNextPage, isLoading]
  );

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return lastElementRef;
};
