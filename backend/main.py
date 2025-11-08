import json
from fastapi import FastAPI, File, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from pydantic import BaseModel
from PIL import Image
import base64
import cv2
import io
import numpy as np
# from google import genai

import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ML_DIR = os.path.join(BASE_DIR, "ml")
sys.path.append(ML_DIR)

from live_detection_with_priority import live_detection_with_priority
from risk_scoring import RiskScorer



app = FastAPI()

# CORS: restrict to frontend origin and avoid credentials for simplicity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)

model = YOLO("yolov8s.pt")

scorer = RiskScorer(
    critical_threshold=8.0,
    important_threshold=4.0,
)


@app.get("/")
async def root():
    return {"message": "Hello World"}
 
@app.post("/analyze")
async def analyze(frame: UploadFile = File(...)):
    print("reached endpoint.")
    contents = await frame.read()

    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        return {"error": "could not decode image"}
    
    # Pass decoded frame into the async detector and await result
    return await live_detection_with_priority(model, scorer, frame)
