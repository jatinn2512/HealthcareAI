export const CLINICAL_OVERVIEW_FALLBACKS = {
  sleepDurationMinutes: 432,
  sleepQualityScore: 85,
  activitySteps: 8432,
  activityWorkoutMinutes: 30,
  vitalsHeartRate: 72,
  vitalsSystolicBp: 120,
  vitalsDiastolicBp: 80,
  vitalsSpo2: 98,
  vitalsTemperatureC: 36.8,
} as const;

export const getBpInterpretation = (systolic?: number | null, diastolic?: number | null): string => {
  if (!systolic || !diastolic) return "N/A";
  if (systolic >= 180 || diastolic >= 120) return "Hypertensive Crisis";
  if (systolic >= 140 || diastolic >= 90) return "Stage 2 Hypertension";
  if (systolic >= 130 || diastolic >= 80) return "Stage 1 Hypertension";
  if (systolic >= 120 && diastolic < 80) return "Elevated BP";
  if (systolic < 90 || diastolic < 60) return "Hypotension Pattern";
  return "Normotensive Range";
};

export const getSpo2Interpretation = (spo2?: number | null): string => {
  if (spo2 === null || spo2 === undefined) return "N/A";
  if (spo2 < 90) return "Severe Hypoxemia Risk";
  if (spo2 < 94) return "Mild Desaturation";
  return "Normal Oxygenation";
};

export const getPulseInterpretation = (heartRate?: number | null): string => {
  if (!heartRate) return "N/A";
  if (heartRate < 60) return "Bradycardia Pattern";
  if (heartRate > 100) return "Tachycardia Pattern";
  return "Normal Sinus Range";
};
