import os
import random
import pandas as pd
import torch
import torch.nn.functional as F
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

from tqdm import tqdm
from collections import defaultdict

from torch.utils.data import Dataset, DataLoader

from transformers import (
    DistilBertTokenizer,
    DistilBertModel
)

from torch.optim import AdamW

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    confusion_matrix,
    classification_report
)

# ==========================================
# OUTPUT FOLDERS
# ==========================================

os.makedirs("impostor_model", exist_ok=True)
os.makedirs("metrics_outputs", exist_ok=True)

# ==========================================
# SETTINGS
# ==========================================

MAX_PAIRS = 6000
MAX_LEN = 96
BATCH_SIZE = 16
EPOCHS = 3
LEARNING_RATE = 2e-5

random.seed(42)

# ==========================================
# LOAD DATASET
# ==========================================

print("📂 Loading dataset...")

df = pd.read_csv("final_dataset_restructured.csv")

df = df.fillna("")

df["context"] = df["context"].astype(str)
df["answer"] = df["answer"].astype(str)
df["label"] = df["label"].astype(int)

# ==========================================
# BUILD TEXT
# ==========================================

# IMPORTANT:
# Removed code-focused formatting
# Keep semantic signal cleaner

df["text"] = (
    df["context"] +
    " " +
    df["answer"]
)

texts = df["text"].tolist()
labels = df["label"].tolist()

print(f"✅ Total rows: {len(df)}")

# ==========================================
# GROUP BY LABEL
# ==========================================

label_to_indices = defaultdict(list)

for idx, lbl in enumerate(labels):
    label_to_indices[lbl].append(idx)
    
label_to_indices[3] = random.sample(label_to_indices[3], 400)

all_labels = list(label_to_indices.keys())

# ==========================================
# CREATE TRAINING PAIRS
# ==========================================

print("🔄 Creating similarity pairs...")

same_pairs = []
diff_pairs = []

half = MAX_PAIRS // 2

# ------------------------------
# SAME LABEL PAIRS
# ------------------------------

while len(same_pairs) < half:

    lbl = random.choice(all_labels)

    bucket = label_to_indices[lbl]

    if len(bucket) < 2:
        continue

    i, j = random.sample(bucket, 2)

    same_pairs.append((
        texts[i],
        texts[j],
        1
    ))

# ------------------------------
# DIFFERENT LABEL PAIRS
# ------------------------------

while len(diff_pairs) < half:

    lbl_a, lbl_b = random.sample(
        all_labels,
        2
    )

    i = random.choice(
        label_to_indices[lbl_a]
    )

    j = random.choice(
        label_to_indices[lbl_b]
    )

    diff_pairs.append((
        texts[i],
        texts[j],
        -1
    ))

pairs = same_pairs + diff_pairs

random.shuffle(pairs)

print(f"✅ Total pairs: {len(pairs)}")

# ==========================================
# TRAIN / VALID SPLIT
# ==========================================

train_pairs, val_pairs = train_test_split(
    pairs,
    test_size=0.2,
    random_state=42
)

print(f"🧠 Training pairs: {len(train_pairs)}")
print(f"🧪 Validation pairs: {len(val_pairs)}")

# ==========================================
# TOKENIZER
# ==========================================

print("🔤 Loading tokenizer...")

tokenizer = DistilBertTokenizer.from_pretrained(
    "distilbert-base-uncased"
)

# ==========================================
# DATASET CLASS
# ==========================================

class PairDataset(Dataset):

    def __init__(
        self,
        pairs,
        tokenizer,
        max_len=MAX_LEN
    ):

        self.pairs = pairs
        self.tokenizer = tokenizer
        self.max_len = max_len

    def __len__(self):

        return len(self.pairs)

    def __getitem__(self, idx):

        text_a, text_b, label = self.pairs[idx]

        encoding_a = self.tokenizer(
            text_a,
            truncation=True,
            padding="max_length",
            max_length=self.max_len,
            return_tensors="pt"
        )

        encoding_b = self.tokenizer(
            text_b,
            truncation=True,
            padding="max_length",
            max_length=self.max_len,
            return_tensors="pt"
        )

        return {

            "input_ids_a":
                encoding_a["input_ids"].squeeze(),

            "attention_mask_a":
                encoding_a["attention_mask"].squeeze(),

            "input_ids_b":
                encoding_b["input_ids"].squeeze(),

            "attention_mask_b":
                encoding_b["attention_mask"].squeeze(),

            "label":
                torch.tensor(
                    label,
                    dtype=torch.float
                )
        }

# ==========================================
# DATALOADERS
# ==========================================

train_dataset = PairDataset(
    train_pairs,
    tokenizer
)

val_dataset = PairDataset(
    val_pairs,
    tokenizer
)

train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True
)

val_loader = DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE
)

# ==========================================
# LOAD MODEL
# ==========================================

print("🧠 Loading DistilBERT model...")

model = DistilBertModel.from_pretrained(
    "distilbert-base-uncased"
)

device = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)

model.to(device)

print(f"⚡ Using device: {device}")

# ==========================================
# OPTIMIZER
# ==========================================

optimizer = AdamW(
    model.parameters(),
    lr=LEARNING_RATE
)

# ==========================================
# LOSS FUNCTION
# ==========================================

# IMPORTANT:
# margin prevents embedding collapse

loss_fn = torch.nn.CosineEmbeddingLoss(
    margin=0.3
)

# ==========================================
# CLS POOLING
# ==========================================

def get_embedding(outputs):

    # CLS token embedding
    embedding = outputs.last_hidden_state[:, 0]

    # IMPORTANT:
    # normalize embeddings
    embedding = F.normalize(
        embedding,
        p=2,
        dim=1
    )

    return embedding

# ==========================================
# TRAINING LOOP
# ==========================================

print("\n🚀 Starting Training...\n")

losses = []

for epoch in range(EPOCHS):

    model.train()

    total_loss = 0

    progress_bar = tqdm(
        train_loader,
        desc=f"Epoch {epoch+1}/{EPOCHS}"
    )

    for batch in progress_bar:

        optimizer.zero_grad()

        # ==================================
        # TEXT A
        # ==================================

        input_ids_a = batch[
            "input_ids_a"
        ].to(device)

        attention_mask_a = batch[
            "attention_mask_a"
        ].to(device)

        outputs_a = model(
            input_ids=input_ids_a,
            attention_mask=attention_mask_a
        )

        embedding_a = get_embedding(
            outputs_a
        )

        # ==================================
        # TEXT B
        # ==================================

        input_ids_b = batch[
            "input_ids_b"
        ].to(device)

        attention_mask_b = batch[
            "attention_mask_b"
        ].to(device)

        outputs_b = model(
            input_ids=input_ids_b,
            attention_mask=attention_mask_b
        )

        embedding_b = get_embedding(
            outputs_b
        )

        # ==================================
        # LOSS
        # ==================================

        labels_batch = batch[
            "label"
        ].to(device)

        loss = loss_fn(
            embedding_a,
            embedding_b,
            labels_batch
        )

        loss.backward()

        torch.nn.utils.clip_grad_norm_(
            model.parameters(),
            1.0
        )

        optimizer.step()

        total_loss += loss.item()

        losses.append(loss.item())

        progress_bar.set_postfix({

            "loss":
                f"{loss.item():.4f}"
        })

    avg_loss = total_loss / len(train_loader)

    print(
        f"\n✅ Epoch {epoch+1} Complete "
        f"| Avg Loss: {avg_loss:.4f}\n"
    )

# ==========================================
# SAVE MODEL
# ==========================================

print("💾 Saving model...")

model.save_pretrained(
    "./impostor_model"
)

tokenizer.save_pretrained(
    "./impostor_model"
)

print("✅ Model saved.")

# ==========================================
# TRAINING LOSS GRAPH
# ==========================================

plt.figure(figsize=(8, 5))

plt.plot(losses)

plt.title("Training Loss")

plt.xlabel("Steps")

plt.ylabel("Loss")

plt.savefig(
    "metrics_outputs/training_loss.png"
)

plt.close()

print("📉 Training loss graph saved.")

# ==========================================
# VALIDATION
# ==========================================

print("\n🧪 Running validation...\n")

model.eval()

y_true = []
y_pred = []

with torch.no_grad():

    for batch in tqdm(
        val_loader,
        desc="Validation"
    ):

        # ------------------------------
        # TEXT A
        # ------------------------------

        input_ids_a = batch[
            "input_ids_a"
        ].to(device)

        attention_mask_a = batch[
            "attention_mask_a"
        ].to(device)

        outputs_a = model(
            input_ids=input_ids_a,
            attention_mask=attention_mask_a
        )

        embedding_a = get_embedding(
            outputs_a
        )

        # ------------------------------
        # TEXT B
        # ------------------------------

        input_ids_b = batch[
            "input_ids_b"
        ].to(device)

        attention_mask_b = batch[
            "attention_mask_b"
        ].to(device)

        outputs_b = model(
            input_ids=input_ids_b,
            attention_mask=attention_mask_b
        )

        embedding_b = get_embedding(
            outputs_b
        )

        # ------------------------------
        # SIMILARITY
        # ------------------------------

        sims = F.cosine_similarity(
            embedding_a,
            embedding_b
        )

        preds = torch.where(
            sims > 0.5,
            1,
            -1
        )

        y_pred.extend(
            preds.cpu().numpy()
        )

        y_true.extend(
            batch["label"].cpu().numpy()
        )

# ==========================================
# REPORT
# ==========================================

print("\n==============================")
print("📊 VALIDATION RESULTS")
print("==============================\n")

print(classification_report(
    y_true,
    y_pred
))

# ==========================================
# CONFUSION MATRIX
# ==========================================

cm = confusion_matrix(
    y_true,
    y_pred
)

print("Confusion Matrix:\n")
print(cm)

# ==========================================
# CONFUSION MATRIX PLOT
# ==========================================

plt.figure(figsize=(5, 4))

sns.heatmap(
    cm,
    annot=True,
    fmt="d",
    cmap="Blues"
)

plt.title("Confusion Matrix")

plt.xlabel("Predicted")

plt.ylabel("Actual")

plt.savefig(
    "metrics_outputs/confusion_matrix.png"
)

plt.close()

print("\n📊 Confusion matrix saved.")

print("\n🎉 Training Complete.")