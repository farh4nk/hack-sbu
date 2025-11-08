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
async def analyze(data: ImageInput):
    try:
        img_data = data.image.split(",")[1]
    except IndexError:
        img_data = data.image
    img_bytes = base64.b64decode(img_data)
    img = Image.open(io.BytesIO(img_bytes))

    results = model.predict(np.array(img))

    labels = []

    for box in results[0].boxes:
        cls_id = int(box.cls)
        label = results[0].names[cls_id]
        labels.append(label)

    if not labels:
        summary = "No objects detected."

    else:
        unique = list(set(labels))
        if len(unique) == 1:
            summary = f"Detected one {unique[0]}"
        else:
            summary = f"Detected {', '.join(unique[:-1])}, and {unique[-1]}."

    return {
        "objects": labels,
        "summary": summary,
        "mode": data.mode
    }
