from flask import Flask, request, jsonify
import torch
import torch.nn.functional as F
import numpy as np
from transformers import DistilBertTokenizer, DistilBertModel
from sklearn.metrics.pairwise import cosine_similarity
import os

# ==============================================================================
# 1. APPLICATION SETUP & HARDWARE CONFIGURATION
# ==============================================================================

app = Flask(__name__)

# Directory path pointing to the fine-tuned Siamese DistilBERT weights
MODEL_PATH = r"train/impostor_model"

print("🧠 Initializing system and loading language model weights...")
tokenizer = DistilBertTokenizer.from_pretrained(MODEL_PATH)
model = DistilBertModel.from_pretrained(MODEL_PATH)

# Dynamically allocate computation to CUDA GPU if available, else default to CPU
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)
model.eval()  # Set model to evaluation mode to disable dropout layers

print(f"⚡ System active. Processing unit allocated: {device}")

# Sequence length configuration matching the downstream tokenization thresholds
MAX_LENGTH = 128

# ==============================================================================
# 2. FEATURE EXTRACTION & TEXT PROCESSING PIPELINE
# ==============================================================================

def generate_embedding(text):
    """
    Tokenizes raw text, passes inputs through DistilBERT, extracts the CLS token, 
    and applies L2 normalization to output a fixed-size semantic vector.
    """
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

    # Extract CLS token embedding from the final hidden state (index 0)
    # This aligns precisely with the pooling strategy used during training
    embedding = outputs.last_hidden_state[:, 0]

    # Apply L2 Normalization so cosine similarity can be tracked via dot products
    embedding = F.normalize(embedding, p=2, dim=1)

    return embedding.cpu().numpy()[0]


def build_player_embedding(player):
    """
    Combines input contexts from a given player into a unified string. 
    Intentionally excludes abstract keywords to prevent shortcut feature leakage, 
    forcing semantic evaluation on real conversational logic.
    """
    sentence = player.get("sentence", "")
    code = player.get("code", "")

    # Consolidate raw textual responses to replicate the training feature pipeline
    text = f"{sentence} {code}".strip()
    return generate_embedding(text)

# ==============================================================================
# 3. CORE ROUTING & IMPOSTOR DETECTION MECHANISM
# ==============================================================================

@app.route("/detect_impostor", methods=["POST"])
def detect_impostor():
    """
    Main execution endpoint. Leverages a Leave-One-Out (LOO) centroid calculation 
    to locate the geometric outlier within a collection of player submissions.
    """
    try:
        data = request.json or {}
        players = data.get("players", [])

        # The mathematical baseline requires an isolated pair and a comparative reference
        if len(players) < 3:
            return jsonify({"error": "Minimum requirement threshold not met. Processing requires at least 3 players."}), 400

        print(f"\n🧠 Generating semantic maps for {len(players)} players...")

        embeddings = []
        player_names = []

        for player in players:
            name = player.get("name", "Unknown")
            player_names.append(name)
            
            # Extract normalized vector representation
            embedding = build_player_embedding(player)
            embeddings.append(embedding)

        embeddings = np.array(embeddings)
        loo_similarities = []

        # ----------------------------------------------------------------------
        # Leave-One-Out (LOO) Spatial Centroid Logic
        # ----------------------------------------------------------------------
        # To prevent a highly polarizing outlier from pulling the overall group average 
        # toward itself, a unique baseline centroid is generated for each calculation 
        # loop that completely excludes the current player being evaluated.
        for i in range(len(players)):
            # Isolate all vectors except the one at index i
            mask = np.arange(len(players)) != i
            others_embeddings = embeddings[mask]

            # Compute the geometric center of the remaining peer group
            others_centroid = np.mean(others_embeddings, axis=0)
            
            # Re-normalize the group vector to preserve scale consistency
            others_centroid = others_centroid / (np.linalg.norm(others_centroid) + 1e-8)

            # Evaluate distance between the isolated player and their peer center point
            sim = float(
                cosine_similarity(
                    embeddings[i].reshape(1, -1),
                    others_centroid.reshape(1, -1)
                )[0][0]
            )
            loo_similarities.append(sim)

        # The lowest baseline similarity score flags the structural impostor
        impostor_index = int(np.argmin(loo_similarities))
        similarities = np.array(loo_similarities)

        # Invert similarity values into positive linear anomaly scales
        anomaly_scores = 1.0 - similarities

        # Min-Max Scaling (NumPy 2.0 compliant top-level function call)
        # Stretches relative contrast boundaries perfectly between 0.0 and 1.0
        ptp_value = np.ptp(anomaly_scores)
        normalized_anomalies = (anomaly_scores - anomaly_scores.min()) / (ptp_value + 1e-8)

        # Invert the metric scale to match diagnostic frontend visualization expectations
        # (Allows 1.0 to reflect total baseline compliance, and 0.0 to reflect the outlier)
        final_display_scores = 1.0 - normalized_anomalies

        results = []
        for i in range(len(players)):
            results.append({
                "name": player_names[i],
                "group_similarity": float(final_display_scores[i])
            })

        # Calculate standard correlation matrix for secondary analytics/reporting
        similarity_matrix = cosine_similarity(embeddings)

        return jsonify({
            "impostor": player_names[impostor_index],
            "players": results,
            "similarity_matrix": similarity_matrix.tolist()
        })

    except Exception as e:
        return jsonify({"error": f"Internal execution runtime failure: {str(e)}"}), 500

# ==============================================================================
# 4. DIAGNOSTIC SYSTEM HEALTH MONITORING
# ==============================================================================

@app.route("/health", methods=["GET"])
def health():
    """
    Returns deployment telemetry, hardware assignments, and service operational status.
    """
    return jsonify({
        "status": "operational",
        "model_architecture": "distilbert-siamese-impostor-detector",
        "compute_device": str(device)
    })

# ==============================================================================
# 5. CONTAINER APPLICATION EXECUTION ENTRYPOINT
# ==============================================================================

if __name__ == "__main__":
    # Debug disabled for standard production consistency to prevent dual hot-loading
    app.run(
        debug=False,
        port=5000
    )