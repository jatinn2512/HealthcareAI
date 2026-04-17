export type HospitalRole = "admin" | "doctor" | "nurse" | "staff";

const STORAGE_KEY = "curasync-hospital-role";

export const HOSPITAL_ROLE_LABELS: Record<HospitalRole, string> = {
  admin: "Admin",
  doctor: "Doctor",
  nurse: "Nurse / Compounder",
  staff: "Staff",
};

export const HOSPITAL_ROLE_ROUTES: Record<HospitalRole, string> = {
  admin: "/hospital/admin",
  doctor: "/hospital/doctor",
  nurse: "/hospital/nurse",
  staff: "/hospital/staff-account",
};

const normalizeHospitalRole = (value: string | null): HospitalRole | null => {
  if (!value) return null;
  if (value === "admin" || value === "doctor" || value === "nurse" || value === "staff") return value;
  return null;
};

export const readHospitalRole = (): HospitalRole | null => {
  if (typeof window === "undefined") return null;
  return normalizeHospitalRole(window.localStorage.getItem(STORAGE_KEY));
};

export const saveHospitalRole = (role: HospitalRole) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, role);
};

export const clearHospitalRole = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
};

export const resolveHospitalRoleLanding = (role: HospitalRole | null) => {
  if (!role) return "/hospital/role-select";
  return HOSPITAL_ROLE_ROUTES[role];
};
