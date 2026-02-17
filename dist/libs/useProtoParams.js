import { useState, useEffect } from "react";
function useProtoParams() {
  const [params, setParams] = useState(() => {
    if (typeof window === "undefined") return {};
    return window.__PROTO_PARAMS__ ?? {};
  });
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === "proto-params" && e.data.params) {
        setParams(e.data.params);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);
  return params;
}
export {
  useProtoParams
};
//# sourceMappingURL=useProtoParams.js.map
