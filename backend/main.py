from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
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
        img_data

