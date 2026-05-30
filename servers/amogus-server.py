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
answers_storage = {}
languages = ["Python", "JavaScript", "C++", "Java", "PHP", "HTML"]

# Helper to find which room a player is in
def find_room_by_sid(sid):
    for rid, data in rooms.items():
        if any(p['id'] == sid for p in data['players']):
            return rid
    return None

@app.route('/api/servers', methods=['GET'])
def get_active_servers():
    active_list = []
    for rid, data in rooms.items():
        active_list.append({
            "id": rid,
            "name": data.get("room_name"),
            "mode": "CODING IMPOSTOR",
            "players": len(data["players"]),
            "maxPlayers": data.get("max_players")
        })
    return jsonify(active_list)

@socketio.on('create_room')
def handle_create(data):
    room_id = str(random.randint(1000, 9999))
    player_name = data.get('name', 'Dev')
    avatar_id = data.get('avatarId', 'fox')
    
    rooms[room_id] = {
        "room_name": data.get('roomName', f"{player_name}'s Terminal"),
        "host": request.sid,
        "players": [{"id": request.sid, "name": player_name, "avatarId": avatar_id}],
        "status": "waiting",
        "max_players": int(data.get('maxPlayers', 16)),
        "language": random.choice(languages) 
    }
    join_room(room_id)
    emit('room_created', {
    'room_id': room_id,
    'players': rooms[room_id]['players'],
    'host': rooms[room_id]['host']
    })
    emit('update_rooms_list', broadcast=True)

@socketio.on('join_existing_room')
def handle_join(data):
    room_id = data.get('room_id')
    if room_id in rooms:
        # PREVENT DUPLICATES: Remove player if they already exist in this room
        rooms[room_id]['players'] = [p for p in rooms[room_id]['players'] if p['id'] != request.sid]
        
        if len(rooms[room_id]['players']) < rooms[room_id]['max_players']:
            join_room(room_id)
            rooms[room_id]['players'].append({
                "id": request.sid, 
                "name": data.get('name', 'Player'), 
                "avatarId": data.get('avatarId', 'cyber')
            })
            emit('player_joined', {
                'players': rooms[room_id]['players'],
                'host': rooms[room_id]['host']
            }, room=room_id)
            emit('update_rooms_list', broadcast=True)
            
# Helper function to find and remove a player by their unique socket ID
def purge_player_from_rooms(sid):
    room_to_delete = None
    
    for rid, data in rooms.items():
        # Create a new list excluding the disconnected player
        original_count = len(data['players'])
        data['players'] = [p for p in data['players'] if p['id'] != sid]
        
        # If the player was actually in this room
        if len(data['players']) != original_count:
            print(f"Purging {sid} from Room {rid}")
            
            # If the room is now empty, mark it for deletion
            if not data['players']:
                room_to_delete = rid
            else:
                # If the host left, reassign the crown to the next player
                if data['host'] == sid:
                    data['host'] = data['players'][0]['id']
                
                # Notify the remaining players to update their UI
                emit('player_joined', {
                    'players': data['players'],
                    'host': data['host']
                }, room=rid)
            break 
            
    if room_to_delete:
        print(f"Deleting empty room: {room_to_delete}")
        del rooms[room_to_delete]
        if room_to_delete in answers_storage:
            del answers_storage[room_to_delete]

# Built-in event triggered by Socket.io when a connection is lost
@socketio.on('disconnect')
def on_disconnect():
    purge_player_from_rooms(request.sid)
    emit('update_rooms_list', broadcast=True)

# Event for the manual "Disconnect" button
@socketio.on('leave_room_manually')
def on_manual_leave(data):
    purge_player_from_rooms(request.sid)
    emit('update_rooms_list', broadcast=True)

if __name__ == '__main__':
    socketio.run(app, debug=True, port=8000)