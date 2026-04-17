from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

TARGET_COLUMN_CANDIDATES = ("target", "class")


def _resolve_target_column(dataframe: pd.DataFrame) -> str:
    for column in TARGET_COLUMN_CANDIDATES:
        if column in dataframe.columns:
            return column
    raise ValueError(
        f"Missing required target column. Expected one of {TARGET_COLUMN_CANDIDATES} in dataset."
    )


def _to_numeric_target(series: pd.Series) -> pd.Series:
    if pd.api.types.is_numeric_dtype(series):
        return pd.to_numeric(series, errors="coerce").fillna(0).astype(int)

    normalized = series.astype(str).str.strip().str.lower()
    mapped = normalized.map(
        {
            "1": 1,
            "0": 0,
            "yes": 1,
            "no": 0,
            "true": 1,
            "false": 0,
            "positive": 1,
            "negative": 0,
            "disease": 1,
            "no_disease": 0,
        }
    )
    return mapped.fillna(0).astype(int)


def _build_canonical_features(dataframe: pd.DataFrame) -> pd.DataFrame:
    def pick(*columns: str, default: float = 0.0) -> pd.Series:
        for column in columns:
            if column in dataframe.columns:
                return pd.to_numeric(dataframe[column], errors="coerce").fillna(default)
        return pd.Series(np.full(len(dataframe), default), index=dataframe.index, dtype=float)

    glucose = pick("glucose", "Glucose", default=100.0)

    features = pd.DataFrame(
        {
            "age": pick("age", "Age", default=40.0),
            "sex": pick("sex", "gender", "Sex", default=0.0),
            "cp": pick("cp", "chest_pain_type", default=0.0),
            "trestbps": pick("trestbps", "pressurehight", "BloodPressure", default=120.0),
            "chol": pick("chol", "cholesterol", default=glucose.mean() if len(glucose) else 180.0),
            "fbs": pick("fbs", default=0.0),
            "thalach": pick("thalach", "impluse", "max_heart_rate", default=150.0),
        }
    )

    if "fbs" not in dataframe.columns:
        features["fbs"] = (glucose > 120).astype(float)

    return features


def main() -> None:
    base_dir = Path(__file__).resolve().parents[1]
    data_path = base_dir / "datasets" / "heart.csv"
    model_dir = base_dir / "models" / "heart"
    model_path = model_dir / "heart_model.pkl"

    if not data_path.exists():
        raise FileNotFoundError(f"Dataset not found: {data_path}")

    dataframe = pd.read_csv(data_path)
    target_column = _resolve_target_column(dataframe)

    x_train = _build_canonical_features(dataframe)
    y_train = _to_numeric_target(dataframe[target_column])

    model = RandomForestClassifier(n_estimators=300, random_state=42)
    model.fit(x_train, y_train)

    model_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, model_path)

    print(f"Heart model trained and saved to: {model_path}")


if __name__ == "__main__":
    main()
