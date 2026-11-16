import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

// useSyncExternalStore em vez de useState + useEffect: o valor é externo ao
// React (o matchMedia do navegador), e ler assim evita o setState síncrono
// dentro do efeito — que é a origem de render em cascata e está barrado pelo
// lint desta casa. O comportamento é o mesmo: no servidor sai false, no
// cliente o valor real já na primeira renderização depois da hidratação.
function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false,
  )
}
