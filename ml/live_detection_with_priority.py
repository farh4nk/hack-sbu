# live_detection_with_priority.py
from collections import defaultdict
import time
import numpy as np
from ultralytics import YOLO
from return_json import detections_to_json
from risk_scoring import RiskScorer, Detection
import logging

# basic setup
logging.basicConfig(level=logging.DEBUG)

# create a logger for this file
logger = logging.getLogger(__name__)



CONF_MIN = 0.60
COOLDOWN_SEC = 4.0
HYST_MARGIN_FRAC = 0.08  # 8% of width

def _zone_with_hysteresis(cx, w, prev_dir):
    left_b  = w / 3.0
    right_b = 2 * w / 3.0
    margin  = HYST_MARGIN_FRAC * w

    # raw zone
    if cx < left_b:
        raw = "left"
    elif cx > right_b:
        raw = "right"
    else:
        raw = "center"

    if prev_dir is None:
        return raw

    # if near a boundary, keep previous to avoid flip-flop
    near_left  = abs(cx - left_b)  <= margin
    near_right = abs(cx - right_b) <= margin
    if (near_left or near_right) and raw != prev_dir:
        return prev_dir
    return raw


async def live_detection_with_priority(model: YOLO, scorer: RiskScorer, frame):
    logger = logging.getLogger(__name__)

    h, w = frame.shape[:2]

    # run tracker
    results = model.track(frame, persist=True, verbose=False)

    detections = []
    for result in results:
        boxes = result.boxes
        if boxes is None or boxes.xyxy is None:
            continue

        xyxy = boxes.xyxy.cpu().numpy().astype(int)
        cls  = boxes.cls.cpu().numpy().astype(int)
        conf = boxes.conf.cpu().numpy()
        ids_t = boxes.id  # may be None if not tracking
        if ids_t is not None:
            ids = ids_t.cpu().numpy().astype(int).reshape(-1).tolist()
        else:
            ids = [None] * len(cls)

        for (x1, y1, x2, y2), c, p, tid in zip(xyxy, cls, conf, ids):
            if p < CONF_MIN:
                continue
            label = model.names.get(c, str(c))
            
            cx = int((x1 + x2) / 2)
            cy = int((y1 + y2) / 2)
            detections.append(Detection(
                label=label,
                x1=x1, y1=y1, x2=x2, y2=y2,
                conf=float(p),
                cx=cx, cy=cy,
                track_id=(int(tid) if tid is not None else None)
            ))

    scored = scorer.score(detections, frame_w=w, frame_h=h)
    json_payload = detections_to_json(scored)


    # ---------- persistent memory on the function ----------
    if not hasattr(live_detection_with_priority, "prev_scene"):
        # key -> {'dir': str, 'cx': int, 'last_seen': float}
        live_detection_with_priority.prev_scene = {}
    if not hasattr(live_detection_with_priority, "id_alias"):
        # map real track_id -> small stable alias 1..N
        live_detection_with_priority.id_alias = {}
    if not hasattr(live_detection_with_priority, "next_alias"):
        live_detection_with_priority.next_alias = 1
    if not hasattr(live_detection_with_priority, "last_announce_text"):
        live_detection_with_priority.last_announce_text = ""
    if not hasattr(live_detection_with_priority, "last_announce_ts"):
        live_detection_with_priority.last_announce_ts = 0.0

    prev_scene = live_detection_with_priority.prev_scene
    id_alias   = live_detection_with_priority.id_alias
    logger.debug(prev_scene, id_alias)

    # ---------- build current scene (people only) ----------
    now = time.time()
    curr_scene = {}  # key -> {'dir': str, 'cx': int}

    for s in scored:
        

        # stable key: prefer track_id; fallback to coarse grid of (cx,cy)
        '''
        if s.track_id is not None:
            real_id = s.track_id
            if real_id not in id_alias:
                id_alias[real_id] = live_detection_with_priority.next_alias
                live_detection_with_priority.next_alias += 1
            alias = id_alias[real_id]
            key = f"person#{alias}"
            prev_dir = prev_scene.get(key, {}).get('dir')
        else:
            # fallback key (rare)
            key = f"person@{round(s.cx/24)}-{round(s.cy/24)}"
            prev_dir = prev_scene.get(key, {}).get('dir')
            '''
        if s.track_id is not None:
            real_id = (s.label, "track", int(s.track_id))  # include label
        else:
            real_id = (s.label, "coarse", round(s.cx/24), round(s.cy/24))

        if real_id not in id_alias:
            id_alias[real_id] = live_detection_with_priority.next_alias
            live_detection_with_priority.next_alias += 1

        alias = id_alias[real_id]
        key = f"{s.label}#{alias}"                     # use the real label
        prev_dir = prev_scene.get(key, {}).get('dir')

        # apply hysteresis using previous direction
        stable_dir = _zone_with_hysteresis(s.cx, w, prev_dir)
        curr_scene[key] = {
            "dir": stable_dir,
            "cx": s.cx,
            "last_seen": now,
            "label": s.label,  
            "alias": alias,                
            "distance": s.distance_bucket  
        }

    # ---------- diff ----------
    added   = [k for k in curr_scene if k not in prev_scene]
    removed = [k for k in prev_scene if k not in curr_scene]
    moved   = [
        k for k in curr_scene
        if k in prev_scene and curr_scene[k]['dir'] != prev_scene[k]['dir']
    ]

    # if nothing changed → stay quiet
    if not (added or removed or moved):
        # refresh timestamps for survivors to avoid stale purge
        for k in curr_scene:
            prev_scene[k] = curr_scene[k]
        return {"detections": json_payload, "summary": ""}

    # ---------- make concise message ----------
    '''
    parts = []
    for k in added:
        # k is like "person#1"
        parts.append(f"{k.split('#')[-1].capitalize()} is on the {curr_scene[k]['dir']}")
    for k in moved:
        parts.append(f"{k.split('#')[-1].capitalize()} moved to the {curr_scene[k]['dir']}")
    for k in removed:
        parts.append(f"{k.split('#')[-1].capitalize()} left")
    '''
    def _ordinal(n: int) -> str:
        m = n % 100
        suf = "th" if 11 <= m <= 13 else {1:"st",2:"nd",3:"rd"}.get(n % 10, "th")
        return f"{n}{suf}"

    parts = []
    for k in added:
        a = curr_scene[k]["alias"]; label = curr_scene[k]["label"]
        d = curr_scene[k]["dir"];   dist = curr_scene[k]["distance"]
        parts.append(f"{_ordinal(a)} {label} is {dist} on your {d}")

    for k in moved:
        a = curr_scene[k]["alias"]; label = curr_scene[k]["label"]; d = curr_scene[k]["dir"]
        parts.append(f"{_ordinal(a)} {label} moved to the {d}")

    for k in removed:
        a = prev_scene[k]["alias"]; label = prev_scene[k]["label"]
        parts.append(f"{_ordinal(a)} {label} left")



    msg = ". ".join(parts) + "."

    print("[SPEAK]", msg)

    # cooldown / duplicate suppression
    last_msg = live_detection_with_priority.last_announce_text
    last_ts  = live_detection_with_priority.last_announce_ts
    if msg == last_msg and (now - last_ts) < COOLDOWN_SEC:
        # suppress repeat
        for k in curr_scene:
            prev_scene[k] = curr_scene[k]
        # drop any long-gone keys (>3s)
        for k in list(prev_scene.keys()):
            if now - prev_scene[k]['last_seen'] > 3.0:
                prev_scene.pop(k, None)
        return {"detections": json_payload, "summary": ""}
    
    if len(curr_scene) == 0:
        live_detection_with_priority.prev_scene = {}
        live_detection_with_priority.id_alias = {}
        live_detection_with_priority.next_alias = 1
        live_detection_with_priority.last_announce_text = ""
        live_detection_with_priority.last_announce_ts = 0.0

    # update memory
    live_detection_with_priority.prev_scene = curr_scene
    live_detection_with_priority.last_announce_text = msg
    live_detection_with_priority.last_announce_ts = now

    return {"detections": json_payload, "summary": msg}
    # update memory
    '''
    live_detection_with_priority.prev_scene = curr_scene
    live_detection_with_priority.last_announce_text = msg
    live_detection_with_priority.last_announce_ts = now

    return {"detections": json_payload, "summary": msg}
    
    
    last_msg = live_detection_with_priority.last_announce_text
    last_ts  = live_detection_with_priority.last_announce_ts
    if msg == last_msg and (now - last_ts) < COOLDOWN_SEC:
        # suppress repeat
        for k in curr_scene:
            prev_scene[k] = curr_scene[k]
        # drop any long-gone keys (>3s)
        for k in list(prev_scene.keys()):
            if now - prev_scene[k]['last_seen'] > 3.0:
                prev_scene.pop(k, None)
        return {"detections": json_payload, "summary": ""}

    # --- reset logic: if nothing visible, restart IDs ---
    if not curr_scene:
        live_detection_with_priority.prev_scene = {}
        live_detection_with_priority.id_alias = {}
        live_detection_with_priority.next_alias = 1
        live_detection_with_priority.last_announce_text = ""
        live_detection_with_priority.last_announce_ts = 0.0

    # update memory
    live_detection_with_priority.prev_scene = curr_scene
    live_detection_with_priority.last_announce_text = msg
    live_detection_with_priority.last_announce_ts = now

    return {"detections": json_payload, "summary": msg}
    '''