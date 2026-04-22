import { LayoutGroup } from "framer-motion";
import { Outlet } from "react-router-dom";

/** Shared layout group for gallery ↔ detail shared-element transitions. */
export function AdoptShell() {
  return (
    <LayoutGroup id="paw-adopt-shared">
      <Outlet />
    </LayoutGroup>
  );
}
