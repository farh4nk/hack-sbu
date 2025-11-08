# live_detection_with_priority.py
# Real-time webcam detection + on-frame risk scoring display.
from fastapi import File, UploadFile
from return_json import detections_to_json

import cv2
import numpy as np
from ultralytics import YOLO

from risk_scoring import RiskScorer, Detection
from google import genai

client = genai.Client(api_key="AIzaSyAN3ntB04PpwJjawU4x5w_aWvBdTbE4wbI")

async def live_detection_with_priority(model: YOLO, scorer: RiskScorer, frame):
# Load YOLOv8 model (n = fastest; switch to 'yolov8s.pt' if you have GPU)
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

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents="Given this dataset give me a summary of what is going on. Be as concise and specific as possible. Imagine you are talking to somebody who is non technical and just wants to know what is happening." + json_payload,
    )

    print(response)

    return {
        "detections": json_payload,
        "gemini": response.text if hasattr(response, "text") else str(response)
    }
