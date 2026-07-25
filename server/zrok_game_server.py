import requests
import random
import threading
import time
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS

app = Flask(__name__)
app.config['SECRET_KEY'] = 'wvsu_cict_secret'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading",
    logger=True,
    engineio_logger=True
)

rooms = {}

# -----------------------------
# SERVER LIST
# -----------------------------
@app.route('/api/servers', methods=['GET'])
def get_active_servers():
    return jsonify([
        {
            "id": rid,
            "name": data.get("room_name"),
            "mode": "CODING IMPOSTOR",
            "players": len(data["players"]),
            "maxPlayers": data.get("max_players")
        }
        for rid, data in rooms.items()
    ])

# -----------------------------
# CREATE ROOM
# -----------------------------
@socketio.on('create_room')
def handle_create(data):
    room_id = str(random.randint(1000, 9999))

    rooms[room_id] = {
        "room_name": data.get('roomName', "Terminal Room"),
        "host": request.sid,
        "players": [{
            "id": request.sid,
            "name": data.get('name', 'Dev'),
            "avatarId": data.get('avatarId', 'fox')
        }],
        "status": "waiting",
        "max_players": int(data.get('maxPlayers', 16)),
        "current_step": 0,
        "time_left": 45,
        "answers": {0: {}, 1: {}, 2: {}},
        "impostorId": None,
        "real_theme": None,
        "fake_theme": None,
        "submitted_players": set(),
        "active_timer_id": None  # FIXED: Replaced timer_running boolean
    }

    join_room(room_id)

    emit('room_created', {
        "room_id": room_id,
        "players": rooms[room_id]["players"],
        "host": rooms[room_id]["host"]
    })

    socketio.emit('update_rooms_list')

# -----------------------------
# JOIN ROOM
# -----------------------------
@socketio.on('join_existing_room')
def handle_join(data):
    room_id = data.get('room_id')

    if room_id not in rooms:
        return

    room = rooms[room_id]

    room["players"] = [p for p in room["players"] if p["id"] != request.sid]

    if len(room["players"]) >= room["max_players"]:
        return

    join_room(room_id)

    room["players"].append({
        "id": request.sid,
        "name": data.get('name', 'Player'),
        "avatarId": data.get('avatarId', 'cyber')
    })

    emit('player_joined', {
        "players": room["players"],
        "host": room["host"]
    }, room=room_id)

    socketio.emit('update_rooms_list')

# -----------------------------
# GET GAME STATE
# -----------------------------
@socketio.on('get_game_state')
def handle_get_game_state(data):
    room_id = data.get("roomId")
    if not room_id or room_id not in rooms:
        return

    room = rooms[room_id]
    
    if room.get("status") != "playing":
        return

    current_step = room.get("current_step", 0)
    has_submitted = request.sid in room.get("submitted_players", set())

    emit("game_state", {
        "real_theme": room.get("real_theme"),
        "fake_theme": room.get("fake_theme"),
        "impostorId": room.get("impostorId"),
        "players": room["players"],
        "step": current_step,
        "timeLeft": room.get("time_left", 45),
        "isSubmitted": has_submitted
    }, room=request.sid)

# -----------------------------
# START GAME
# -----------------------------
@socketio.on("start_game")
def handle_start_game(data):
    room_id = data.get("room_id")
    if room_id not in rooms:
        return
    
    room = rooms[room_id]
    if len(room["players"]) < 4:
        emit("error", {"message": "Need at least 4 players"})
        return

    # Pick impostor
    impostor_id = random.choice([p["id"] for p in room["players"]])

    # Choose themes
    available_themes = ["web development", "machine learning", "databases"]
    real_theme = random.choice(available_themes)
    fake_theme = random.choice([t for t in available_themes if t != real_theme])

    room.update({
        "real_theme": real_theme,
        "fake_theme": fake_theme,
        "current_step": 0,
        "time_left": 45,
        "answers": {0: {}, 1: {}, 2: {}},
        "status": "playing",
        "impostorId": impostor_id,
        "submitted_players": set(),
        "active_timer_id": None  # FIXED: Replaced timer_running boolean
    })

    print(f"✅ Game started in room {room_id}")
    print(f"   Impostor: {impostor_id}")
    print(f"   Real theme: {real_theme}")
    print(f"   Fake theme: {fake_theme}")

    # Send game started event
    emit("game_started", {
        "real_theme": real_theme,
        "fake_theme": fake_theme,
        "impostorId": impostor_id,
        "players": room["players"]
    }, room=room_id)

    # Start timer
    start_timer(room_id)

# -----------------------------
# START TIMER (FIXED VERSION)
# -----------------------------
def start_timer(room_id):
    if room_id not in rooms:
        return
    
    room = rooms[room_id]
    
    # Generate unique timer ID - old threads will recognize they're outdated
    timer_id = f"{time.time()}_{random.random()}"
    room["active_timer_id"] = timer_id
    room["time_left"] = 45
    
    print(f"⏰ Starting timer [{timer_id[:15]}...] for room {room_id}")
    
    # Send initial timer value
    socketio.emit("timer_update", {
        "timeLeft": 45,
        "step": room["current_step"]
    }, room=room_id)
    
    def run_timer():
        my_timer_id = timer_id  # Capture THIS timer's ID
        
        while room_id in rooms:
            time.sleep(1)
            
            if room_id not in rooms:
                break
                
            room = rooms[room_id]
            
            # CRITICAL FIX: Is THIS timer still the active one?
            if room.get("active_timer_id") != my_timer_id:
                print(f"⏰ Timer [{my_timer_id[:15]}...] exiting - superseded by new timer")
                break
            
            if room.get("status") != "playing":
                break
                
            room["time_left"] -= 1
            current_time = room["time_left"]
            
            print(f"⏰ Room {room_id} timer: {current_time}s")
            
            # Double-check we're still active before emitting
            if room.get("active_timer_id") != my_timer_id:
                break
                
            socketio.emit("timer_update", {
                "timeLeft": current_time,
                "step": room["current_step"]
            }, room=room_id)
            
            if current_time <= 0:
                print(f"⏰ Timer [{my_timer_id[:15]}...] finished!")
                force_submit(room_id)
                break
    
    # Start timer thread
    timer_thread = threading.Thread(target=run_timer, daemon=True)
    timer_thread.start()

# -----------------------------
# FORCE SUBMIT
# -----------------------------
def force_submit(room_id):
    if room_id not in rooms:
        return
    
    room = rooms[room_id]
    current_step = room["current_step"]
    
    print(f"⚠️ Force submitting for room {room_id}, step {current_step}")
    
    # Auto-submit for any players who haven't submitted
    for player in room["players"]:
        sid = player["id"]
        if sid not in room["submitted_players"]:
            if current_step not in room["answers"]:
                room["answers"][current_step] = {}
            if sid not in room["answers"][current_step]:
                room["answers"][current_step][sid] = ""
            room["submitted_players"].add(sid)
            socketio.emit("submitted_confirmed", {"step": current_step, "auto": True}, room=sid)
    
    # Move to next question
    move_to_next(room_id)

# -----------------------------
# MOVE TO NEXT QUESTION
# -----------------------------
def move_to_next(room_id):
    if room_id not in rooms:
        return
    
    room = rooms[room_id]
    current_step = room["current_step"]
    
    if current_step < 2:
        next_step = current_step + 1
        room["current_step"] = next_step
        room["submitted_players"] = set()
        
        print(f"📝 Moving to question {next_step + 1}/3")
        
        socketio.emit("next_question", {
            "step": next_step,
            "timeLeft": 45
        }, room=room_id)
        
        # Calling start_timer here automatically invalidates the old timer
        # because it assigns a brand new active_timer_id
        start_timer(room_id)
    else:
        print(f"🏁 All questions completed! Evaluating...")
        evaluate_round(room_id)

# -----------------------------
# SUBMIT ANSWER
# -----------------------------
@socketio.on("submit_answer_step")
def handle_submit(data):
    room_id = data.get("roomId")
    step = data.get("step")
    answer = data.get("answer")

    if room_id not in rooms:
        return

    room = rooms[room_id]
    sid = request.sid
    
    if room.get("status") != "playing":
        return
    
    if step != room["current_step"]:
        print(f"⚠️ Wrong step: got {step}, expected {room['current_step']}")
        return
    
    if sid in room["submitted_players"]:
        print(f"⚠️ Player already submitted")
        return
    
    # Store answer
    if step not in room["answers"]:
        room["answers"][step] = {}
    
    room["answers"][step][sid] = answer
    room["submitted_players"].add(sid)
    
    print(f"✅ Player submitted for step {step} ({len(room['submitted_players'])}/{len(room['players'])})")
    
    emit("submitted_confirmed", {"step": step}, room=sid)
    
    # Check if all submitted
    if len(room["submitted_players"]) >= len(room["players"]):
        print(f"🎉 All players submitted! Moving to next question...")
        # We don't need to toggle timer_running to False anymore.
        # move_to_next() calls start_timer() which overwrites the ID, 
        # naturally killing the old thread.
        move_to_next(room_id)

# -----------------------------
# EVALUATION (ML INTEGRATED)
# -----------------------------
def evaluate_round(room_id):
    room = rooms.get(room_id)
    if not room:
        return

    print(f"📊 Raw answers dump: {room['answers']}")
    print(f"📊 Evaluating round for room {room_id} using ML model...")
    
    # 1. Format and capture raw player submissions for the ML model & Audit Ledger
    ml_players = []
    audit_ledger = [] # 🧠 This goes to React for the Natural Language Conversational Audit panel
    
    for player in room["players"]:
        sid = player["id"]
        
        # Fetch what they typed across all 3 submission windows
        sentence_answer = room["answers"].get(0, {}).get(sid, "")
        keywords_answer = room["answers"].get(1, {}).get(sid, "")
        code_answer = room["answers"].get(2, {}).get(sid, "")

        # Payload sent down to Python DistilBERT microservice
        ml_players.append({
            "name": player["name"],
            "sentence": sentence_answer,
            "keywords": keywords_answer,
            "code": code_answer
        })

        # Structured object detailing text fields + metadata for the frontend audit display
        audit_ledger.append({
            "id": sid,
            "name": player["name"],
            "avatarId": player.get("avatarId", "cyber"),
            "sentence": sentence_answer,
            "code": code_answer
        })

    # Declare ML receiving structures at the root method level to avoid initialization bugs
    ml_impostor_name = None
    ml_player_stats = {}
    similarity_matrix = [] # 🧠 Capture cross-correlation values from your model pipeline

    try:
        print("🤖 Forwarding tokens to DistilBERT Siamese Core Cluster...")
        ml_response = requests.post(
            "http://127.0.0.1:5000/detect_impostor",
            json={"players": ml_players},
            timeout=10
        )

        ml_data = ml_response.json()
        print("ML RESPONSE DATA RECIEVED:", ml_data)

        ml_impostor_name = ml_data.get("impostor")
        ml_players_result = ml_data.get("players", [])
        similarity_matrix = ml_data.get("similarity_matrix", []) # 🧠 Secure the heatmap grid array!

        # Build clean lookup maps
        for p in ml_players_result:
            ml_player_stats[p["name"]] = p["group_similarity"]

    except Exception as e:
        print(f"❌ ML Server Connection Failure: {e}")
        # In case of microservice failure, assemble a procedural mock grid matrix so front-end components don't freeze
        num_p = len(room["players"])
        similarity_matrix = [[1.0 if r == c else 0.5 for c in range(num_p)] for r in range(num_p)]

    # 3. Correlate names to establish exact Socket ID of the ML target choice
    actual_impostor_sid = room.get("impostorId")
    if ml_impostor_name:
        for p in room["players"]:
            if p["name"] == ml_impostor_name:
                actual_impostor_sid = p["id"]
                break

    # 4. Compile structural payload array for React map iterations
    results = []
    for player in room["players"]:
        name = player["name"]
        
        # Pull the exact Min-Max Contrast Stretched similarity value computed by your backend script
        # Fallback to 0.0 for actual impostor sid match, or 1.0 for crewmate blend if service went offline
        is_game_assigned_impostor = (player["id"] == room.get("impostorId"))
        default_fallback = 0.0 if is_game_assigned_impostor else 1.0
        sim_score = ml_player_stats.get(name, default_fallback)
        
        # A player is flagged anomalous if they hit the bottom edge of the dynamic range scale
        is_suspicious = (sim_score < 0.20)        
        
        results.append({
            "playerId": player["id"],
            "name": name,
            "avatarId": player.get("avatarId", "cyber"),
            "prediction": "IMPOSTOR" if player["id"] == actual_impostor_sid else "CREWMATE",
            "group_similarity": sim_score, # 🧠 Matched exactly to player.group_similarity in React UI!
            "is_suspicious": is_suspicious
        })
    
    # 5. Emit complete data packets across the Room Channel
    print(f"🏁 Broadcast wrapping. Dispatching Telemetry Core to Room: {room_id}")
    socketio.emit("round_finished", {
        "results": results,                                    # Populates the cards grid
        "impostor": next((p["name"] for p in room["players"] if p["id"] == actual_impostor_sid), "Unknown"), # The name string
        "similarity_matrix": similarity_matrix,                # Populates the diagnostic heatmap table
        "theme": room.get("real_theme", "unknown"),
        "fake_theme": room.get("fake_theme", "unknown"),
        "impostorId": actual_impostor_sid,
        "players": audit_ledger                                # Populates text verification feeds
    }, room=room_id)
    
# -----------------------------
# CHAT SYSTEM
# -----------------------------
@socketio.on('send_room_message')
def handle_chat_message(data):
    room_id = data.get('room_id')
    
    if not room_id or room_id not in rooms:
        return
    
    emit('receive_room_message', {
        "id": request.sid,
        "sender": data.get('sender', 'Unknown'),
        "avatarId": data.get('avatarId', 'cyber'),
        "message": data.get('message', '')
    }, room=room_id)

# -----------------------------
# CLEANUP
# -----------------------------
def purge_player_from_rooms(sid):
    room_to_delete = None

    for rid, room in rooms.items():
        before = len(room["players"])
        room["players"] = [p for p in room["players"] if p["id"] != sid]

        if len(room["players"]) != before:
            if not room["players"]:
                room_to_delete = rid
            else:
                if room["host"] == sid:
                    room["host"] = room["players"][0]["id"]
                
                if sid in room.get("submitted_players", set()):
                    room["submitted_players"].discard(sid)
                
                socketio.emit('player_joined', {
                    "players": room["players"],
                    "host": room["host"]
                }, room=rid)
            break

    for room in rooms.values():
        for step in room.get("answers", {}):
            room["answers"][step].pop(sid, None)

    if room_to_delete:
        del rooms[room_to_delete]

# -----------------------------
# DISCONNECT
# -----------------------------
@socketio.on('disconnect')
def on_disconnect(reason=None):
    purge_player_from_rooms(request.sid)
    socketio.emit('update_rooms_list')

@socketio.on('leave_room_manually')
def on_manual_leave():
    purge_player_from_rooms(request.sid)
    socketio.emit('update_rooms_list')

# -----------------------------
# RUN SERVER
# -----------------------------
if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0", port=8000, debug=True)