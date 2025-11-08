# live_detection_with_priority.py
# Real-time webcam detection + on-frame risk scoring display.
from return_json import detections_to_json

import cv2
import numpy as np
from ultralytics import YOLO

from risk_scoring import RiskScorer, Detection

# Load YOLOv8 model (n = fastest; switch to 'yolov8s.pt' if you have GPU)
model = YOLO("yolov8n.pt")
scorer = RiskScorer(
    
    critical_threshold=8.0,
    important_threshold=4.0,
)


cap = cv2.VideoCapture(0)

cap.set(cv2.CAP_PROP_FRAME_WIDTH,  640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

window_name = "VisionTalk AI — Live (YOLO + Risk)"
cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    h, w = frame.shape[:2]

    # Run YOLO inference
    results = model(frame, verbose=False)
    detections = []

    for result in results:
        # Boxes: xyxy, cls, conf
        boxes = result.boxes
        if boxes is None or boxes.xyxy is None:
            continue

        xyxy = boxes.xyxy.cpu().numpy().astype(int)      # (N, 4)
        cls   = boxes.cls.cpu().numpy().astype(int)      # (N,)
        conf  = boxes.conf.cpu().numpy()                 # (N,)

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

    # Score detections
    scored = scorer.score(detections, frame_w=w, frame_h=h)
    json_payload = detections_to_json(scored)
    print(json_payload)
    # Draw zones (optional visual guide)
    one_third = w // 3
    cv2.line(frame, (one_third, 0), (one_third, h), (60, 60, 60), 1)
    cv2.line(frame, (2 * one_third, 0), (2 * one_third, h), (60, 60, 60), 1)

    
    for s in scored:
        # Color by priority level
        if s.priority_level == 3:
            color = (0, 0, 255)     # red
        elif s.priority_level == 2:
            color = (0, 165, 255)   # orange
        else:
            color = (0, 200, 0)     # green

        # Bounding box
        cv2.rectangle(frame, (s.x1, s.y1), (s.x2, s.y2), color, 2)
        cv2.circle(frame, (s.cx, s.cy), 3, color, -1)

        # Label text
        text = f"{s.label} priority={s.priority:.1f} [{s.direction},{s.distance_bucket}]"
        if s.motion_toward_center:
            text += " ↘︎center"

        # Put label
        y_text = max(15, s.y1 - 8)
        cv2.putText(frame, text, (s.x1, y_text),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

    # Optional: show top-1 alert at top bar
    if scored:
        top = scored[0]
        banner = f"TOP: {top.label} | dir={top.direction} | dist={top.distance_bucket} | priority={top.priority:.1f}"
        cv2.rectangle(frame, (0, 0), (w, 28), (30, 30, 30), -1)
        cv2.putText(frame, banner, (8, 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    cv2.imshow(window_name, frame)

    # 'q' to quit
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
