from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from pydantic import BaseModel
from PIL import Image
import base64
import io
import numpy as np

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

model = YOLO("yolov8s.pt")

class ImageInput(BaseModel):
    image: str
    mode: str

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/analyze")
# decode base64 image
async def analyze(data: ImageInput):
    try:
        img_data = data.image.split(",")[1]
    except IndexError:
        img_data = data.image
    img_bytes = base64.b64decode(img_data)
    img = Image.open(io.BytesIO(img_bytes))

# yolov8 detection
    results = model.predict(np.array(img))
    boxes = results[0].boxes
    frame_w = results[0].orig_shape[1]

    def get_position(x, w, frame_w):
        center_x = x + w / 2
        if center_x < frame_w / 3:
            return "left"
        elif center_x > 2 * frame_w / 3:
            return "right"
        else:
            return "center"
        

    detected = []

    for box in boxes:
        cls_id = int(box.cls)
        label = results[0].names[cls_id]
        x, y, w, h = box.xywh[0]
        pos = get_position(x, w, frame_w)
        detected.append((label, pos))

    positions = {"left": [], "center": [], "right": []}
    for label, pos in detected:
        positions[pos].append(label)
    
    parts = []
    for side in ["left", "center", "right"]:
        if positions[side]:
            objs = ", ".join(set(positions[side]))
            phrase = f'{objs} on the {side}'
            parts.append(phrase)

    if parts:
        summary = ", ".join(parts)
    else:
        summary = "No recognizable objects detected."

    return {
        "objects": detected,
        "summary": summary,
        "mode": data.mode
    }
