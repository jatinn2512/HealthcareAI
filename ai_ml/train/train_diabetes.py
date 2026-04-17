from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

FEATURE_COLUMNS = [
    "Pregnancies",
    "Glucose",
    "BloodPressure",
    "SkinThickness",
    "Insulin",
    "BMI",
    "DiabetesPedigreeFunction",
    "Age",
]
TARGET_COLUMN = "Outcome"


def main() -> None:
    base_dir = Path(__file__).resolve().parents[1]
    data_path = base_dir / "datasets" / "diabetes.csv"
    model_dir = base_dir / "models" / "diabetes"
    model_path = model_dir / "diabetes_model.pkl"

    if not data_path.exists():
        raise FileNotFoundError(f"Dataset not found: {data_path}")

    dataframe = pd.read_csv(data_path)
    expected_columns = set(FEATURE_COLUMNS + [TARGET_COLUMN])
    missing_columns = [column for column in expected_columns if column not in dataframe.columns]
    if missing_columns:
        raise ValueError(f"Missing required diabetes columns: {missing_columns}")

    x_train = dataframe[FEATURE_COLUMNS].copy()
    y_train = dataframe[TARGET_COLUMN].copy()

    model = RandomForestClassifier(n_estimators=300, random_state=42)
    model.fit(x_train, y_train)

    model_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, model_path)

    print(f"Diabetes model trained and saved to: {model_path}")


if __name__ == "__main__":
    main()
