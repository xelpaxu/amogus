import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification
from torch.optim import AdamW
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# =========================
# 1. LOAD DATASET
# =========================
df = pd.read_csv('dataset.csv')

df = df.fillna("")
df['sentence'] = df['sentence'].astype(str)
df['keywords'] = df['keywords'].astype(str)
df['code'] = df['code'].astype(str)
df['theme'] = df['theme'].astype(str)
df['label'] = df['label'].astype(int)

# 🔥 IMPORTANT: Combine inputs with structure
df['text'] = (
    "Theme: " + df['theme'] + ". " +
    "Sentence: " + df['sentence'] + ". " +
    "Keywords: " + df['keywords'] + ". " +
    "Code: " + df['code']
)

# =========================
# 2. TRAIN TEST SPLIT
# =========================
train_texts, val_texts, train_labels, val_labels = train_test_split(
    df['text'].tolist(),
    df['label'].tolist(),
    test_size=0.2,
    random_state=42
)

# =========================
# 3. TOKENIZER
# =========================
tokenizer = DistilBertTokenizer.from_pretrained('distilbert-base-uncased')

class GameDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_len=256):
        self.encodings = tokenizer(
            texts,
            truncation=True,
            padding=True,
            max_length=max_len
        )
        self.labels = labels

    def __getitem__(self, idx):
        item = {key: torch.tensor(val[idx]) for key, val in self.encodings.items()}
        item['labels'] = torch.tensor(self.labels[idx])
        return item

    def __len__(self):
        return len(self.labels)

train_dataset = GameDataset(train_texts, train_labels, tokenizer)
val_dataset = GameDataset(val_texts, val_labels, tokenizer)

# =========================
# 4. MODEL (BINARY)
# =========================
model = DistilBertForSequenceClassification.from_pretrained(
    'distilbert-base-uncased',
    num_labels=2  # 🔥 binary classification
)

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model.to(device)

# =========================
# 5. TRAINING LOOP
# =========================
train_loader = DataLoader(train_dataset, batch_size=8, shuffle=True)
optimizer = AdamW(model.parameters(), lr=3e-5)

print("🚀 Training Coding Impostor Model...")

model.train()
for epoch in range(4):
    total_loss = 0

    for batch in train_loader:
        optimizer.zero_grad()

        input_ids = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        labels = batch['labels'].to(device)

        outputs = model(
            input_ids,
            attention_mask=attention_mask,
            labels=labels
        )

        loss = outputs.loss
        loss.backward()
        optimizer.step()

        total_loss += loss.item()

    print(f"Epoch {epoch+1} - Avg Loss: {total_loss / len(train_loader):.4f}")

# =========================
# 6. SAVE MODEL
# =========================
model.save_pretrained('./impostor_model')
tokenizer.save_pretrained('./impostor_model')

print("✅ Model saved to ./impostor_model")

# =========================
# 7. EVALUATION
# =========================
model.eval()
val_loader = DataLoader(val_dataset, batch_size=8)

predictions = []

with torch.no_grad():
    for batch in val_loader:
        input_ids = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)

        outputs = model(input_ids, attention_mask=attention_mask)
        preds = torch.argmax(outputs.logits, dim=1)

        predictions.extend(preds.cpu().tolist())

print("\n📊 Classification Report:")
print(classification_report(val_labels, predictions))