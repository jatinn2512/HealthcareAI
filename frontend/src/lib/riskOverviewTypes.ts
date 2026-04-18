/** Shared types for GET /risk/overview (patient + doctor report). */

export type MonitoringOverview = {
  bp?: string | null;
  bp_source?: string | null;
  bp_source_label?: string | null;
  hr?: number | null;
  hr_source?: string | null;
  hr_source_label?: string | null;
  spo2?: number | null;
  spo2_source?: string | null;
  spo2_source_label?: string | null;
  temperature_c?: number | null;
  temperature_c_source?: string | null;
  temperature_c_source_label?: string | null;
  blood_glucose_mg_dl?: number | null;
  blood_glucose_source?: string | null;
  blood_glucose_source_label?: string | null;
  last_updated?: string | null;
};

export type VitalsOverviewSlice = {
  heart_rate?: number | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  spo2?: number | null;
  temperature_c?: number | null;
  blood_glucose_mg_dl?: number | null;
  logged_at?: string | null;
  source_type?: string | null;
  recorded_at?: string | null;
  source_device?: string | null;
};

export type RuleBasedRiskOverview = {
  heart_risk: string;
  diabetes_risk: string;
  reason: string;
  bmi?: number | null;
};

export type RiskOverview = {
  sleep?: {
    sleep_date?: string | null;
    duration_minutes?: number | null;
    quality_score?: number | null;
    created_at?: string | null;
    source_type?: string | null;
    recorded_at?: string | null;
    source_device?: string | null;
  } | null;
  activity?: {
    steps?: number | null;
    workout_minutes?: number | null;
    calories_burned?: number | null;
    distance_km?: number | null;
    logged_at?: string | null;
    source_type?: string | null;
    recorded_at?: string | null;
    source_device?: string | null;
  } | null;
  vitals?: VitalsOverviewSlice | null;
  food?: {
    latest_item?: string | null;
    latest_logged_at?: string | null;
    latest_calories?: number | null;
    latest_sodium_mg?: number | null;
    latest_note?: string | null;
    latest_alert?: string | null;
    latest_dish_name?: string | null;
    latest_restaurant_name?: string | null;
    latest_choice_at?: string | null;
    alert_counts?: Record<string, number>;
    recent_choices?: number;
  } | null;
  monitoring?: MonitoringOverview | null;
  trends?: {
    vitals_bp_last3?: Array<{
      systolic_bp?: number | null;
      diastolic_bp?: number | null;
      recorded_at?: string;
      source_type?: string;
      source_label?: string;
    }>;
    bp_7d_avg?: string | null;
    bp_trend?: string;
    glucose_high_readings_last5?: number;
  } | null;
  rule_based_risk?: RuleBasedRiskOverview | null;
  data_quality?: { message?: string } | null;
  symptoms_recent?: string | null;
};
