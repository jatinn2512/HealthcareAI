import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { readHospitalRole, resolveHospitalRoleLanding, type HospitalRole } from "@/lib/hospitalRole";

interface HospitalRoleRouteProps {
  children: ReactNode;
  allowedRoles?: HospitalRole[];
}

const HospitalRoleRoute = ({ children, allowedRoles }: HospitalRoleRouteProps) => {
  const location = useLocation();
  const role = readHospitalRole();

  if (!role) {
    return <Navigate to="/hospital/role-select" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={resolveHospitalRoleLanding(role)} replace />;
  }

  return <>{children}</>;
};

export default HospitalRoleRoute;
