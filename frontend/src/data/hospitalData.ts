export type DashboardKpi = {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "stable";
};

export type ThroughputPoint = {
  day: string;
  analyses: number;
  admissions: number;
  discharges: number;
};

export type DepartmentLoad = {
  department: string;
  occupancyPercent: number;
  activeCases: number;
  waitingCases: number;
};

export type DoctorStatus = "On Duty" | "In Surgery" | "Off Duty";

export type DoctorRecord = {
  id: string;
  name: string;
  specialization: string;
  status: DoctorStatus;
  patientsAssigned: number;
  nextRound: string;
  todayAppointments: number;
};

export type StaffTaskPriority = "High" | "Medium" | "Low";
export type StaffTaskState = "Open" | "In Progress" | "Done";

export type StaffTask = {
  id: string;
  title: string;
  owner: string;
  department: string;
  dueAt: string;
  priority: StaffTaskPriority;
  state: StaffTaskState;
};

export type ResourceStatus = "Healthy" | "Warning" | "Critical";

export type ResourceRecord = {
  id: string;
  name: string;
  available: number;
  total: number;
  threshold: number;
  status: ResourceStatus;
  updatedAt: string;
};

export type EmergencyPriority = "Critical" | "High" | "Medium";
export type EmergencyState = "New" | "Acknowledged" | "Dispatched" | "Resolved";

export type EmergencyAlert = {
  id: string;
  patientName: string;
  issue: string;
  priority: EmergencyPriority;
  state: EmergencyState;
  location: string;
  raisedAt: string;
};

export type HospitalProfileData = {
  hospitalName: string;
  hospitalCode: string;
  adminName: string;
  officialEmail: string;
  supportPhone: string;
  city: string;
  address: string;
  totalBeds: string;
  traumaLevel: string;
  icuCapacity: string;
  emergencyHotline: string;
  specialties: string;
};

export type HospitalSettingsData = {
  autoEscalationEnabled: boolean;
  escalationMinutes: number;
  lowResourceThresholdPercent: number;
  emergencySmsEnabled: boolean;
  emergencyEmailEnabled: boolean;
  staffTaskRemindersEnabled: boolean;
  autoAssignEmergencyEnabled: boolean;
  dashboardRefreshSeconds: number;
};

export const dashboardKpis: DashboardKpi[] = [
  { label: "Analyses Today", value: "186", delta: "+14%", trend: "up" },
  { label: "Active Patients", value: "242", delta: "+9%", trend: "up" },
  { label: "Open Emergencies", value: "12", delta: "-8%", trend: "down" },
  { label: "Staff On Shift", value: "74", delta: "Stable", trend: "stable" },
];

export const throughputByDay: ThroughputPoint[] = [
  { day: "Mon", analyses: 148, admissions: 44, discharges: 36 },
  { day: "Tue", analyses: 161, admissions: 49, discharges: 40 },
  { day: "Wed", analyses: 172, admissions: 52, discharges: 43 },
  { day: "Thu", analyses: 164, admissions: 47, discharges: 45 },
  { day: "Fri", analyses: 186, admissions: 58, discharges: 51 },
  { day: "Sat", analyses: 139, admissions: 38, discharges: 34 },
  { day: "Sun", analyses: 121, admissions: 30, discharges: 28 },
];

export const departmentLoads: DepartmentLoad[] = [
  { department: "Emergency", occupancyPercent: 88, activeCases: 39, waitingCases: 7 },
  { department: "ICU", occupancyPercent: 84, activeCases: 34, waitingCases: 3 },
  { department: "Cardiology", occupancyPercent: 67, activeCases: 28, waitingCases: 5 },
  { department: "Pulmonology", occupancyPercent: 61, activeCases: 24, waitingCases: 6 },
];

export const doctors: DoctorRecord[] = [
  {
    id: "DOC-101",
    name: "Dr. Meera Khanna",
    specialization: "Cardiology",
    status: "On Duty",
    patientsAssigned: 18,
    nextRound: "18:00",
    todayAppointments: 22,
  },
  {
    id: "DOC-123",
    name: "Dr. Arjun Verma",
    specialization: "Emergency Medicine",
    status: "In Surgery",
    patientsAssigned: 11,
    nextRound: "19:15",
    todayAppointments: 16,
  },
  {
    id: "DOC-144",
    name: "Dr. Sana Rahman",
    specialization: "Pulmonology",
    status: "On Duty",
    patientsAssigned: 15,
    nextRound: "17:30",
    todayAppointments: 19,
  },
  {
    id: "DOC-209",
    name: "Dr. Vikram Das",
    specialization: "General Medicine",
    status: "Off Duty",
    patientsAssigned: 8,
    nextRound: "Tomorrow 08:30",
    todayAppointments: 12,
  },
];

export const staffTasks: StaffTask[] = [
  {
    id: "ST-301",
    title: "Reallocate ICU nurse coverage",
    owner: "Operations Manager",
    department: "ICU",
    dueAt: "Today 18:30",
    priority: "High",
    state: "In Progress",
  },
  {
    id: "ST-318",
    title: "Review pending discharge paperwork",
    owner: "Front Desk Lead",
    department: "Admissions",
    dueAt: "Today 17:45",
    priority: "Medium",
    state: "Open",
  },
  {
    id: "ST-327",
    title: "Audit oxygen refill schedule",
    owner: "Biomedical Team",
    department: "Resources",
    dueAt: "Today 20:00",
    priority: "High",
    state: "Open",
  },
  {
    id: "ST-339",
    title: "Update duty roster for weekend",
    owner: "HR Coordinator",
    department: "Staffing",
    dueAt: "Tomorrow 11:00",
    priority: "Low",
    state: "Done",
  },
];

export const resources: ResourceRecord[] = [
  { id: "RS-01", name: "ICU Beds", available: 6, total: 40, threshold: 20, status: "Warning", updatedAt: "2 min ago" },
  { id: "RS-02", name: "General Beds", available: 62, total: 180, threshold: 15, status: "Healthy", updatedAt: "2 min ago" },
  { id: "RS-03", name: "Ventilators", available: 4, total: 18, threshold: 30, status: "Critical", updatedAt: "1 min ago" },
  { id: "RS-04", name: "Ambulances", available: 3, total: 6, threshold: 35, status: "Warning", updatedAt: "3 min ago" },
  { id: "RS-05", name: "Oxygen Cylinders", available: 76, total: 110, threshold: 25, status: "Healthy", updatedAt: "4 min ago" },
  { id: "RS-06", name: "Blood Units (A+)", available: 19, total: 30, threshold: 30, status: "Healthy", updatedAt: "5 min ago" },
];

export const emergencyAlerts: EmergencyAlert[] = [
  {
    id: "ER-7001",
    patientName: "Riya Sharma",
    issue: "Severe chest pain reported from app",
    priority: "Critical",
    state: "Dispatched",
    location: "Sector 18, Noida",
    raisedAt: "2 min ago",
  },
  {
    id: "ER-7002",
    patientName: "Karan Sethi",
    issue: "Very low SpO2 trend and breathlessness",
    priority: "High",
    state: "Acknowledged",
    location: "Dwarka, Delhi",
    raisedAt: "7 min ago",
  },
  {
    id: "ER-7003",
    patientName: "Anita Joseph",
    issue: "Post-surgery dizziness and fall risk",
    priority: "Medium",
    state: "New",
    location: "Green Park, Delhi",
    raisedAt: "14 min ago",
  },
  {
    id: "ER-7004",
    patientName: "Yash Malhotra",
    issue: "Persistent high BP with headache",
    priority: "High",
    state: "Resolved",
    location: "Vasant Kunj, Delhi",
    raisedAt: "29 min ago",
  },
];

export const defaultHospitalProfile: HospitalProfileData = {
  hospitalName: "CuraSync Multi-Speciality Hospital",
  hospitalCode: "CURA-DEL-01",
  adminName: "Hospital Administration",
  officialEmail: "admin@curasync-hospital.com",
  supportPhone: "+91-11-4455-8899",
  city: "New Delhi",
  address: "A-19, Health Avenue, New Delhi",
  totalBeds: "220",
  traumaLevel: "Level 1",
  icuCapacity: "40",
  emergencyHotline: "1800-202-911",
  specialties: "Cardiology, Pulmonology, Emergency Medicine, General Surgery",
};

export const defaultHospitalSettings: HospitalSettingsData = {
  autoEscalationEnabled: true,
  escalationMinutes: 8,
  lowResourceThresholdPercent: 20,
  emergencySmsEnabled: true,
  emergencyEmailEnabled: true,
  staffTaskRemindersEnabled: true,
  autoAssignEmergencyEnabled: false,
  dashboardRefreshSeconds: 30,
};
