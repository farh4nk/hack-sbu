
import json
from datetime import datetime, timezone
from typing import List
from risk_scoring import ScoredDetection

def detections_to_json(scored_detections: List[ScoredDetection], limit: int = 5) -> str:
    top = scored_detections[:limit]

    scene = []
    for s in top:
        scene.append({
            "object": s.label,
            "direction": s.direction,
            "distance": s.distance_bucket,
            "priority": round(s.priority, 1),
            "priority_level": s.priority_level,
            "motion_toward_center": s.motion_toward_center
        })

    payload = {
        "scene": scene,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    return json.dumps(payload, indent=2)
