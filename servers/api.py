from flask import Flask, request, jsonify

import torch
import torch.nn.functional as F
import numpy as np

from transformers import (
    DistilBertTokenizer,
    DistilBertModel
)

from sklearn.metrics.pairwise import cosine_similarity

# ==========================================
# FLASK APP
# ==========================================

app = Flask(__name__)

# ==========================================
# LOAD MODEL
# ==========================================

model_path = "../train/impostor_model"

print("🧠 Loading model...")

tokenizer = DistilBertTokenizer.from_pretrained(
    model_path
)

model = DistilBertModel.from_pretrained(
    model_path
)

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

model.to(device)

model.eval()

print(f"⚡ Using device: {device}")

# ==========================================
# SETTINGS
# ==========================================

MAX_LENGTH = 128

# ==========================================
# GENERATE NORMALIZED EMBEDDING
# ==========================================

# IMPORTANT:
# Uses CLS token pooling to match train.py's get_embedding()
# Mean pooling was removed — it causes a mismatch with training

def generate_embedding(text):

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=MAX_LENGTH
    ).to(device)

    with torch.no_grad():

        outputs = model(
            input_ids=inputs["input_ids"],
            attention_mask=inputs["attention_mask"]
        )

    # CLS token embedding — matches train.py
    embedding = outputs.last_hidden_state[:, 0]

    # Normalize
    embedding = F.normalize(
        embedding,
        p=2,
        dim=1
    )

    return embedding.cpu().numpy()[0]

# ==========================================
# BUILD PLAYER EMBEDDING
# ==========================================

# IMPORTANT:
# Combines all player fields into a single text string
# to match the training format: context + answer
# Weighted fusion was removed — it caused domain mismatch

def build_player_embedding(player):

    sentence = player.get("sentence", "")
    keywords = player.get("keywords", "")
    code = player.get("code", "")

    # Mirror train.py text format:
    # keywords = context, sentence + code = answer
    text = f"{keywords} {sentence} {code}".strip()

    embedding = generate_embedding(text)

    return embedding

# ==========================================
# DETECT IMPOSTOR
# ==========================================

@app.route(
    "/detect_impostor",
    methods=["POST"]
)
def detect_impostor():

    try:

        data = request.json

        players = data.get(
            "players",
            []
        )

        # ==================================
        # VALIDATION
        # ==================================

        if len(players) < 3:

            return jsonify({

                "error":
                    "Need at least 3 players"

            }), 400

        # ==================================
        # GENERATE EMBEDDINGS
        # ==================================

        print("\n🧠 Generating embeddings...")

        embeddings = []
        player_names = []

        for player in players:

            name = player.get(
                "name",
                "Unknown"
            )

            player_names.append(name)

            embedding = build_player_embedding(
                player
            )

            embeddings.append(embedding)

        embeddings = np.array(embeddings)

        # ==================================
        # SIMILARITY MATRIX
        # ==================================

        similarity_matrix = cosine_similarity(
            embeddings
        )

        # ==================================
        # GROUP CENTROID
        # ==================================

        centroid = np.mean(
            embeddings,
            axis=0
        )

        # Normalize centroid
        centroid = (
            centroid /
            np.linalg.norm(centroid)
        )

        # ==================================
        # SIMILARITY TO GROUP CENTROID
        # ==================================

        centroid_similarities = cosine_similarity(
            embeddings,
            centroid.reshape(1, -1)
        ).flatten()

        # ==================================
        # LOWEST SIMILARITY TO CENTROID
        # = IMPOSTOR
        # ==================================

        impostor_index = np.argmin(
            centroid_similarities
        )

        # ==================================
        # PLAYER RESULTS
        # ==================================

        results = []

        for i in range(len(players)):

            results.append({

                "name":
                    player_names[i],

                "group_similarity":
                    round(
                        float(centroid_similarities[i]),
                        4
                    )
            })

        # ==================================
        # RESPONSE
        # ==================================

        return jsonify({

            "impostor":
                player_names[impostor_index],

            "players":
                results,

            "similarity_matrix":
                similarity_matrix.tolist()

        })

    except Exception as e:

        return jsonify({

            "error": str(e)

        }), 500

# ==========================================
# HEALTH CHECK
# ==========================================

@app.route("/health", methods=["GET"])
def health():

    return jsonify({

        "status": "ok",

        "model": "distilbert-impostor-detector",

        "device": str(device)

    })

# ==========================================
# RUN SERVER
# ==========================================

if __name__ == "__main__":

    app.run(
        debug=False,
        port=5000
    )