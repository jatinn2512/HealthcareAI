from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

TARGET_COLUMN = "Diagnosis"
DROP_COLUMNS = ("PatientID", "DoctorInCharge")


def _prepare_target(dataframe: pd.DataFrame) -> pd.Series:
    target = dataframe[TARGET_COLUMN]
    if pd.api.types.is_numeric_dtype(target):
        return pd.to_numeric(target, errors="coerce").fillna(0).astype(int)

    normalized = target.astype(str).str.strip().str.lower()
    mapped = normalized.map(
        {
            "1": 1,
            "0": 0,
            "yes": 1,
            "no": 0,
            "positive": 1,
            "negative": 0,
            "asthma": 1,
            "healthy": 0,
        }
    )
    return mapped.fillna(0).astype(int)


def main() -> None:
    base_dir = Path(__file__).resolve().parents[1]
    data_path = base_dir / "datasets" / "asthma.csv"
    model_dir = base_dir / "models" / "asthma"
    model_path = model_dir / "asthma_model.pkl"

    if not data_path.exists():
        raise FileNotFoundError(f"Dataset not found: {data_path}")

    dataframe = pd.read_csv(data_path)
    if TARGET_COLUMN not in dataframe.columns:
        raise ValueError(f"Missing required target column '{TARGET_COLUMN}' in {data_path}")

    y_train = _prepare_target(dataframe)
    x_train = dataframe.drop(columns=[TARGET_COLUMN], errors="ignore").drop(columns=list(DROP_COLUMNS), errors="ignore")
    x_train = pd.get_dummies(x_train, drop_first=True)

    model = RandomForestClassifier(n_estimators=400, random_state=42, class_weight="balanced_subsample")
    model.fit(x_train, y_train)

    model_dir.mkdir(parents=True, exist_ok=True)
    artifact = {
        "model": model,
        "feature_names": list(x_train.columns),
    }
    joblib.dump(artifact, model_path)

    print(f"Asthma model trained and saved to: {model_path}")


if __name__ == "__main__":
    main()
