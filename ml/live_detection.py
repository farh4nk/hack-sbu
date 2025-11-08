import cv2
import numpy as np
from ultralytics import YOLO

# Load YOLOv8 model (downloads automatically if not present)
model = YOLO("yolov8n.pt")


cap = cv2.VideoCapture(0)

# Optional: set resolution
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Run YOLO inference on the current frame
    results = model(frame, verbose=False)

    # Process detections
    for result in results:
        boxes = result.boxes.xyxy.cpu().numpy()     # [x1, y1, x2, y2]
        classes = result.boxes.cls.cpu().numpy()    # class indices
        confidences = result.boxes.conf.cpu().numpy()

        for box, cls, conf in zip(boxes, classes, confidences):
            x1, y1, x2, y2 = box.astype(int)
            label = model.names[int(cls)]
            cx, cy = int((x1 + x2) / 2), int((y1 + y2) / 2)

            # Draw bounding box and label
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(
                frame,
                f"{label} ({cx},{cy})",
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255, 255, 255),
                2
            )

    # Show frame
    cv2.imshow("VisionTalk AI - Live Detection", frame)

    # Press 'q' to quit
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break



# Cleanup
cap.release()
cv2.destroyAllWindows()
