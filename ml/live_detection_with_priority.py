# live_detection_with_priority.py
# Real-time webcam detection + on-frame risk scoring display.
from fastapi import File, UploadFile # type: ignore
from return_json import detections_to_json
from collections import defaultdict
import cv2 # type: ignore
import numpy as np
from ultralytics import YOLO # type: ignore

from risk_scoring import RiskScorer, Detection
from google import genai

client = genai.Client(api_key="AIzaSyAN3ntB04PpwJjawU4x5w_aWvBdTbE4wbI")
'''
def generate_local_summary(scored):
    if not scored:
        return "No objects detected."

    high_risks = [s for s in scored if s.priority_level >= 2]
    phrases = []

    for s in high_risks:
        obj = s.label
        dir = s.direction
        dist = s.distance_bucket
        level = s.priority_level

        if level == 3:
            phrases.append(f"Warning, {obj} very close on your {dir} side.")
        elif level == 2:
            phrases.append(f"{obj.capitalize()} nearby on your {dir} side.")
        else:
            phrases.append(f"A {obj} is {dist} on your {dir} side.")

    if not phrases:
        top = scored[0]
        return f"A {top.label} is {top.distance_bucket} on your {top.direction} side."

    return " ".join(phrases)
'''
def generate_local_summary(scored):
    if not scored:
        return "No objects detected."

    
    grouped = defaultdict(list)
    for s in scored:
        grouped[s.label].append(s)

    sentences = []

    for label, items in grouped.items():
        items.sort(key=lambda x: x.priority, reverse=True)
        count = len(items)
        parts = []

        for i, s in enumerate(items, start=1):
            part = ""
            if count > 1:
                if i == 1:
                    part += f"a {label}"
                else:
                    part += f"a {i}nd {label}" if i == 2 else f"a {i}th {label}"
            else:
                part += f"a {label}"

            part += f" is {s.distance_bucket} on your {s.direction} side"
            parts.append(part)

        sentence = ", ".join(parts)
        sentence = sentence[0].upper() + sentence[1:] + "."
        sentences.append(sentence)

    sentences.sort(key=lambda txt: (
        "warning" in txt.lower(),
        len(txt)
    ), reverse=True)

    return " ".join(sentences)

async def live_detection_with_priority(model: YOLO, scorer: RiskScorer, frame):

    print("workingggggg")
    # contents = await file.read()

    # nparr = np.frombuffer(contents, np.uint8)
    # frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # if frame is None:
    #     return {"error": "could not decode image"}

    h, w = frame.shape[:2]

    results = model(frame, verbose=False)
    detections = []

    for result in results:
        boxes = result.boxes
        if boxes is None or boxes.xyxy is None:
            continue

        xyxy = boxes.xyxy.cpu().numpy().astype(int)
        cls   = boxes.cls.cpu().numpy().astype(int)
        conf  = boxes.conf.cpu().numpy()

        for (x1, y1, x2, y2), c, p in zip(xyxy, cls, conf):
            label = model.names.get(c, str(c))
            cx = int((x1 + x2) / 2)
            cy = int((y1 + y2) / 2)

            detections.append(Detection(
                label=label,
                x1=x1, y1=y1, x2=x2, y2=y2,
                conf=float(p),
                cx=cx, cy=cy
            ))

    scored = scorer.score(detections, frame_w=w, frame_h=h)
    json_payload = detections_to_json(scored)

    #response = client.models.generate_content(
       # model="gemini-2.5-flash",
        #contents="Given this dataset give me a summary of what is going on. Be as concise and specific as possible. Imagine you are talking to somebody who is non technical and just wants to know what is happening." + json_payload,
    #)

    summary = generate_local_summary(scored)

    return {
        "detections": json_payload,
        "summary" : summary
    }
