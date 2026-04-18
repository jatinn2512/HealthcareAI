"""Multi-source health monitoring: priority and normalization."""

SOURCE_LAB_REPORT = "lab_report"
SOURCE_INSTANT_ALERT = "instant_alert"
SOURCE_MANUAL = "manual"
SOURCE_WEARABLE = "wearable"

ALL_SOURCE_TYPES: tuple[str, ...] = (
    SOURCE_LAB_REPORT,
    SOURCE_INSTANT_ALERT,
    SOURCE_MANUAL,
    SOURCE_WEARABLE,
)

# Higher number wins when choosing the canonical "current" value per signal.
SOURCE_PRIORITY: dict[str, int] = {
    SOURCE_LAB_REPORT: 4,
    SOURCE_INSTANT_ALERT: 3,
    SOURCE_MANUAL: 2,
    SOURCE_WEARABLE: 1,
}


def normalize_source_type(value: str | None) -> str:
    if not value:
        return SOURCE_WEARABLE
    key = value.strip().lower()
    if key in ALL_SOURCE_TYPES:
        return key
    return SOURCE_WEARABLE


def source_priority(source_type: str | None) -> int:
    return SOURCE_PRIORITY.get(normalize_source_type(source_type), 1)


def human_source_label(source_type: str | None) -> str:
    return {
        SOURCE_LAB_REPORT: "Report",
        SOURCE_INSTANT_ALERT: "Alert",
        SOURCE_MANUAL: "Manual",
        SOURCE_WEARABLE: "Wearable",
    }.get(normalize_source_type(source_type), "Wearable")
