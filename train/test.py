import requests

# ensure your server.py is running on port 5000
SERVER_URL = "http://127.0.0.1:5000/predict"

def run_test_round():
    # settings for this test round
    secret_place = "Hospital"
    
    # simulation of 5 players (4 vibers who know it's a hospital, 1 glitch who is guessing)
    players = [
        {
            "name": "Player 1 (Viber)",
            "role": "Viber",
            "keywords": "stethoscope, medicine, ward",
            "phrase": "the doctor will see you now",
            "action": "i am checking the patient's heart rate"
        },
        {
            "name": "Player 2 (Viber)",
            "role": "Viber",
            "keywords": "nurse, iv drip, charts",
            "phrase": "please keep the noise down in the hallway",
            "action": "i am changing the bandages on the wound"
        },
        {
            "name": "Player 3 (Glitch)",
            "role": "Glitch",
            "keywords": "table, chair, coffee",
            "phrase": "can i get a refill on this?",
            "action": "i am sitting down and reading a book"
        },
        {
            "name": "Player 4 (Viber)",
            "role": "Viber",
            "keywords": "ambulance, emergency, gurney",
            "phrase": "we need a surgeon in room 4",
            "action": "i am rushing a patient to the er"
        },
        {
            "name": "Player 5 (Viber)",
            "role": "Viber",
            "keywords": "x-ray, clinic, face mask",
            "phrase": "take a deep breath and hold it",
            "action": "i am reviewing the lung scans"
        }
    ]

    print(f"--- testing impostor detection ---")
    print(f"secret location: {secret_place}\n")

    suspects = []

    for p in players:
        # glue the 3 parts together just like the model expects
        combined_text = f"{p['keywords']}. {p['phrase']}. {p['action']}."
        
        try:
            # send to flask server
            response = requests.post(SERVER_URL, json={"text": combined_text})
            result = response.json()
            
            pred = result['prediction']
            conf = result['confidence']

            print(f"{p['name']} -> AI Predicted: {pred} ({conf*100:.1f}%)")

            # logic: if the ai says they are NOT at the hospital, they are a suspect
            if pred.lower() != secret_place.lower():
                suspects.append({"name": p['name'], "role": p['role'], "detected_as": pred})
        
        except Exception as e:
            print(f"error: check if server.py is running! ({e})")
            return

    # final analysis
    print("\n" + "="*40)
    print("AI VERDICT")
    print("="*40)
    
    if not suspects:
        print("the glitch successfully fooled the ai!")
    else:
        for s in suspects:
            if s['role'] == "Glitch":
                print(f"SUCCESS: AI caught {s['name']}! (AI thought they were in a {s['detected_as']})")
            else:
                print(f"FALSE ALARM: AI wrongly suspected {s['name']} (Actually a Viber)")

if __name__ == "__main__":
    run_test_round()