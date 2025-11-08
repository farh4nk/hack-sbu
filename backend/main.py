import json
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from pydantic import BaseModel
from PIL import Image
import base64
import io
import numpy as np
# from google import genai

import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ML_DIR = os.path.join(BASE_DIR, "ml")
sys.path.append(ML_DIR)

from live_detection_with_priority import live_detection_with_priority




app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

model = YOLO("yolov8s.pt")


@app.get("/")
async def root():
    return {"message": "Hello World"}
 
@app.post("/analyze")
async def analyze():
    return live_detection_with_priority()
