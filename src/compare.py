import json
import time
import torch
import sys
import numpy as np
from transformers import pipeline, CLIPProcessor, CLIPModel
from PIL import Image

# Load config + data
with open("config.json") as f:
    config = json.load(f)

with open("data/data.json") as f:
    data = json.load(f)

# Load model + processor
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

# Load image
image = Image.open("./capture--auto.jpg")

with torch.no_grad():
    inputs = processor(images=image, return_tensors="pt") #
    # get_image_features applies the projection to 512-d
    image_features = model.get_image_features(**inputs) 

# 4. Normalize and Convert to Numpy
image_features = image_features / image_features.norm(p=2, dim=-1, keepdim=True) #
photo_embedding = image_features.numpy().flatten() # Shape (1, 512)

def cosine_similarity(a, b):
    a = np.array(a)
    b = np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

best_match = None
best_score = -float("inf")

for release in data:
    score = cosine_similarity(photo_embedding, release["embedding"])

    if score > best_score:
        best_score = score
        best_match = f'{release["id"]} = {release["artist"]} – {release["title"]}'

sys.stdout.write(best_match)
sys.stdout.flush()
sys.exit(0)