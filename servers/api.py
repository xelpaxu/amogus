from flask import Flask, request, jsonify
import torch
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification

app = Flask(__name__)

# Load your newly trained model
model_path = './saved_model'
tokenizer = DistilBertTokenizer.from_pretrained(model_path)
model = DistilBertForSequenceClassification.from_pretrained(model_path)

device = torch.device('cuda') if torch.cuda.is_available() else torch.device('cpu')
model.to(device)
model.eval()

# Must be in the exact alphabetical order used during training
class_names = ['C++', 'HTML', 'Java', 'JavaScript', 'PHP', 'Python']

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    text = data.get('text', '')
    target_context = data.get('target', '') # The actual language of the round
    
    # Pre-process text (ensure lowercase as per training)
    inputs = tokenizer(text.lower(), return_tensors="pt", truncation=True, padding=True, max_length=256).to(device)
    
    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        pred_idx = torch.argmax(probs).item()
        confidence = probs[0][pred_idx].item()
    
    predicted_lang = class_names[pred_idx]
    
    # Return both the prediction and a match-status for the game server
    return jsonify({
        "prediction": predicted_lang,
        "confidence": confidence,
        "is_match": predicted_lang.lower() == target_context.lower()
    })

if __name__ == '__main__':
    # Running on port 5000 as expected by game_server.py
    app.run(debug=False, port=5000)