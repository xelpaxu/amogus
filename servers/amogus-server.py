import requests
import random
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS

app = Flask(__name__)
app.config['SECRET_KEY'] = 'wvsu_cict_secret'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

rooms = {}
languages = ["Python", "JavaScript", "C++", "Java", "PHP", "HTML"]

# -----------------------------
# ROOM LOOKUP
# -----------------------------
def find_room_by_sid(sid):
    for rid, data in rooms.items():
        if any(p['id'] == sid for p in data['players']):
            return rid
    return None

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

        "theme": None,
        "current_step": 0,
        "processing_step": None,
        "answers": {0: {}, 1: {}, 2: {}}
    }

    join_room(room_id)

    emit('room_created', {
        "room_id": room_id,
        "players": rooms[room_id]["players"],
        "host": rooms[room_id]["host"]
    })

    emit('update_rooms_list', broadcast=True)

# -----------------------------
# JOIN ROOM
# -----------------------------
@socketio.on('join_existing_room')
def handle_join(data):
    room_id = data.get('room_id')

    if room_id not in rooms:
        return

    room = rooms[room_id]

    # remove duplicate connection
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

    emit('update_rooms_list', broadcast=True)

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
        return

    theme = random.choice([
        "web development",
        "machine learning",
        "databases"
    ])

    room.update({
        "theme": theme,
        "current_step": 0,
        "answers": {0: {}, 1: {}, 2: {}},
        "status": "playing"
    })

    emit("game_started", {
        "theme": theme
    }, room=room_id)

    emit("next_question", {
        "step": 0
    }, room=room_id)

# -----------------------------
# EVALUATION
# -----------------------------
def evaluate_round(room_id):
    room = rooms.get(room_id)
    if not room:
        return

    results = []

    for player in room["players"]:
        sid = player["id"]

        combined_text = f"""
        {room['answers'][0].get(sid, '')}.
        {room['answers'][1].get(sid, '')}.
        {room['answers'][2].get(sid, '')}.
        """

        try:
            response = requests.post(
                "http://127.0.0.1:5000/predict",
                json={
                    "text": combined_text,
                    "theme": room["theme"]
                }
            )

            result = response.json()

            results.append({
                "playerId": sid,
                "name": player["name"],
                "prediction": result["prediction"],
                "confidence": result["confidence"],
                "is_suspicious": not result["is_theme_match"]
            })

        except Exception as e:
            results.append({
                "playerId": sid,
                "name": player["name"],
                "prediction": "ERROR",
                "confidence": 0,
                "is_suspicious": True
            })

    socketio.emit("round_finished", {
        "results": results,
        "theme": room["theme"]
    }, room=room_id)

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

    if step not in room["answers"]:
        return

    if sid in room["answers"][step]:
        return  # prevent spam overwrite

    room["answers"][step][sid] = answer

    expected = len(room["players"])
    submitted = len(room["answers"][step])

    if submitted == expected:

        if step < 2:
            room["current_step"] += 1

            socketio.emit("next_question", {
                "step": room["current_step"]
            }, room=room_id)

        else:
            evaluate_round(room_id)

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

                socketio.emit('player_joined', {
                    "players": room["players"],
                    "host": room["host"]
                }, room=rid)

            break

    # remove answers safely
    for room in rooms.values():
        for step in room["answers"]:
            room["answers"][step].pop(sid, None)

    if room_to_delete:
        del rooms[room_to_delete]

# -----------------------------
# DISCONNECT EVENTS
# -----------------------------
@socketio.on('disconnect')
def on_disconnect():
    purge_player_from_rooms(request.sid)
    socketio.emit('update_rooms_list', broadcast=True)

@socketio.on('leave_room_manually')
def on_manual_leave():
    purge_player_from_rooms(request.sid)
    socketio.emit('update_rooms_list', broadcast=True)

# -----------------------------
# RUN SERVER
# -----------------------------
if __name__ == '__main__':
    socketio.run(app, debug=True, port=8000)