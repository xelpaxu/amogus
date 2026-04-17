import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification
from torch.optim import AdamW
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# 1. Load and clean coding data
# Using the new coding_dataset.csv we created
df = pd.read_csv('coding_dataset.csv')

df = df.dropna(subset=['text', 'label'])
df['text'] = df['text'].astype(str).str.lower()
df['label'] = df['label'].str.strip()

# Map labels: ['C++', 'HTML', 'Java', 'JavaScript', 'PHP', 'Python']
df['label'] = df['label'].astype('category')
# Alphabetical sorting is default for categories
label_map = dict(enumerate(df['label'].cat.categories))
df['label_code'] = df['label'].cat.codes

print(f"Mapped Labels: {label_map}")

# 2. Split for evaluation 
train_texts, val_texts, train_labels, val_labels = train_test_split(
    df['text'].tolist(), df['label_code'].tolist(), test_size=0.2, random_state=42
)

# 3. Tokenize
tokenizer = DistilBertTokenizer.from_pretrained('distilbert-base-uncased')

class CodingDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_len=256):
        self.encodings = tokenizer(texts, truncation=True, padding=True, max_length=max_len)
        self.labels = labels

    def __getitem__(self, idx):
        item = {key: torch.tensor(val[idx]) for key, val in self.encodings.items()}
        item['labels'] = torch.tensor(self.labels[idx])
        return item

    def __len__(self):
        return len(self.labels)

train_dataset = CodingDataset(train_texts, train_labels, tokenizer)
val_dataset = CodingDataset(val_texts, val_labels, tokenizer)

# 4. Model Setup (6 Labels)
model = DistilBertForSequenceClassification.from_pretrained(
    'distilbert-base-uncased', 
    num_labels=len(label_map)
)

device = torch.device('cuda') if torch.cuda.is_available() else torch.device('cpu')
model.to(device)

# 5. Training Loop
loader = DataLoader(train_dataset, batch_size=8, shuffle=True)
optim = AdamW(model.parameters(), lr=3e-5) # Slightly lower learning rate for stability

print(f"Starting training on {len(label_map)} Coding Languages...")

model.train()
for epoch in range(5): # Increased epochs for better technical pattern recognition
    total_loss = 0
    for batch in loader:
        optim.zero_grad()
        input_ids = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        labels = batch['labels'].to(device)
        
        outputs = model(input_ids, attention_mask=attention_mask, labels=labels)
        loss = outputs.loss
        loss.backward()
        optim.step()
        total_loss += loss.item()
    print(f"Epoch {epoch+1} - Avg Loss: {total_loss/len(loader):.4f}")

# 6. Save Model
model.save_pretrained('./saved_model')
tokenizer.save_pretrained('./saved_model')
print("Model saved to ./saved_model")

# 7. Final Evaluation
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

print("\n--- Coding Language Evaluation Report ---")
print(classification_report(val_labels, predictions, target_names=list(label_map.values())))