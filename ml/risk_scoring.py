# risk_scoring.py
# Computes per-object risk priority from YOLO detections.
# Uses bbox size (proximity), movement toward center (motion), and class base weights.

from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional
import math
import time


@dataclass
class Detection:
    label: str
    x1: int
    y1: int
    x2: int
    y2: int
    conf: float
    cx: int
    cy: int
    track_id: Optional[int] = None


@dataclass
class ScoredDetection:
    label: str
    x1: int
    y1: int
    x2: int
    y2: int
    conf: float
    cx: int
    cy: int
    priority: float
    priority_level: int     # 1=info, 2=important, 3=critical
    direction: str          # left / center / right
    distance_bucket: str    # far / medium / close
    motion_toward_center: bool
    track_id: Optional[int] = None


class RiskScorer:
    """
    Maintains simple frame-to-frame association (nearest-centroid per class)
    to estimate whether an object is moving toward the frame center.
    """

    def __init__(self,
                 base_weights: Optional[Dict[str, float]] = None,
                 critical_threshold: float = 8.0,
                 important_threshold: float = 4.0):
        # Default base weights (tune as needed)
        self.base_weights = base_weights or {
            "bus": 6.0,
            "truck": 6.0,
            "car": 5.0,
            "motorcycle": 5.0,
            "bicycle": 4.0,
            "person": 3.0,
            "stop sign": 3.0,
            "bench": 2.0,
            "chair": 1.5,
            "dog": 2.0,
            "cat": 1.5,
            "bottle": 1.0,
            "backpack": 1.0,
            "cell phone": 1.0,
            "laptop": 1.0,
            "door": 2.0,
        }
        self.critical_threshold = critical_threshold
        self.important_threshold = important_threshold

        # Memory for simple tracking: {label: [(cx, cy, timestamp)]}
        self.prev_centroids: Dict[str, List[Tuple[int, int, float]]] = {}

    @staticmethod
    def _zone_from_x(cx: int, frame_w: int) -> str:
        if cx < frame_w / 3:
            return "left"
        elif cx > 2 * frame_w / 3:
            return "right"
        return "center"

    @staticmethod
    def _distance_bucket(area_ratio: float) -> str:
        # area_ratio = bbox_area / frame_area
        if area_ratio >= 0.20:
            return "close"
        elif area_ratio >= 0.07:
            return "medium"
        return "far"

    @staticmethod
    def _proximity_factor(area_ratio: float) -> float:
        # Smooth mapping: 1.0 (tiny) → ~2.5 (very large)
        # Clamp to avoid explosions
        return max(1.0, min(2.5, 1.0 + 7.0 * area_ratio))

    @staticmethod
    def _euclid(x1: int, y1: int, x2: int, y2: int) -> float:
        return math.hypot(x2 - x1, y2 - y1)

    def _motion_factor(self,
                       label: str,
                       cx: int,
                       cy: int,
                       frame_w: int,
                       frame_h: int) -> Tuple[float, bool]:
        """
        Compare current distance-to-center with nearest prior centroid
        of the same class to see if it moved toward center.
        Returns (motion_factor, moving_toward_center).
        """
        now = time.time()
        center_x, center_y = frame_w // 2, frame_h // 2
        curr_d = self._euclid(cx, cy, center_x, center_y)

        prev_list = self.prev_centroids.get(label, [])
        # Keep only recent memory (last ~2 seconds)
        prev_list = [p for p in prev_list if now - p[2] <= 2.0]
        self.prev_centroids[label] = prev_list

        if not prev_list:
            # No history → neutral
            self.prev_centroids[label].append((cx, cy, now))
            return 1.0, False

        # Nearest previous centroid for this class
        nearest = min(prev_list, key=lambda p: self._euclid(cx, cy, p[0], p[1]))
        prev_d = self._euclid(nearest[0], nearest[1], center_x, center_y)

        moving_toward = (prev_d - curr_d) > 10.0  # moved ≥10 px toward center
        # Gentle boost if moving toward center; slight penalty if moving away
        factor = 1.2 if moving_toward else 0.95

        # Update memory with current
        self.prev_centroids[label].append((cx, cy, now))
        # Keep small buffer
        if len(self.prev_centroids[label]) > 8:
            self.prev_centroids[label] = self.prev_centroids[label][-8:]

        return factor, moving_toward

    def score(self,
              detections: List[Detection],
              frame_w: int,
              frame_h: int) -> List[ScoredDetection]:
        frame_area = float(frame_w * frame_h)
        scored: List[ScoredDetection] = []

        for d in detections:
            bbox_area = max(1.0, float((d.x2 - d.x1) * (d.y2 - d.y1)))
            area_ratio = bbox_area / frame_area

            base = self.base_weights.get(d.label, 1.0)
            prox = self._proximity_factor(area_ratio)
            mot, moving_toward = self._motion_factor(d.label, d.cx, d.cy, frame_w, frame_h)

            priority = base * prox * mot

            if priority >= self.critical_threshold:
                level = 3
            elif priority >= self.important_threshold:
                level = 2
            else:
                level = 1

            scored.append(
                ScoredDetection(
                    label=d.label,
                    x1=d.x1, y1=d.y1, x2=d.x2, y2=d.y2,
                    conf=d.conf,
                    cx=d.cx, cy=d.cy,
                    priority=round(priority, 2),
                    priority_level=level,
                    direction=self._zone_from_x(d.cx, frame_w),
                    distance_bucket=self._distance_bucket(area_ratio),
                    motion_toward_center=moving_toward,
                    track_id=d.track_id,
                )
            )

        # Sort by highest priority first
        scored.sort(key=lambda s: s.priority, reverse=True)
        return scored
