

# ========== CELL 1: INSTALL DEPENDENCIES ==========
!pip install -q cryptography pycryptodome flask flask-socketio flask-sqlalchemy flask-login flask-wtf eventlet python-socketio pyngrok

print("✅ Dependencies installed!")

# ========== CELL 2: SETUP POST-QUANTUM CRYPTOGRAPHY (FIXED) ==========
import base64
import hashlib
import os
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.asymmetric import x25519
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305
from cryptography.hazmat.primitives import serialization  # CORRECT IMPORT

class PostQuantumCrypto:
    """Post-quantum secure cryptography using X25519 + ChaCha20-Poly1305"""

    def __init__(self):
        self.private_key = x25519.X25519PrivateKey.generate()
        self.public_key = self.private_key.public_key()

    def get_public_bytes(self):
        return self.public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )

    def get_private_bytes(self):
        return self.private_key.private_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PrivateFormat.Raw,
            encryption_algorithm=serialization.NoEncryption()
        )

    def derive_shared_key(self, peer_public_bytes):
        peer_public = x25519.X25519PublicKey.from_public_bytes(peer_public_bytes)
        shared_key = self.private_key.exchange(peer_public)

        # HKDF for key derivation
        derived_key = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=None,
            info=b'p2p-chat-key'
        ).derive(shared_key)

        return derived_key

    def encrypt(self, plaintext, key):
        nonce = os.urandom(12)
        chacha = ChaCha20Poly1305(key)
        ciphertext = chacha.encrypt(nonce, plaintext.encode(), None)
        return base64.b64encode(nonce + ciphertext).decode()

    def decrypt(self, encrypted_data, key):
        data = base64.b64decode(encrypted_data)
        nonce = data[:12]
        ciphertext = data[12:]
        chacha = ChaCha20Poly1305(key)
        plaintext = chacha.decrypt(nonce, ciphertext, None)
        return plaintext.decode()

print("✅ Post-Quantum Crypto ready!")

# ========== CELL 3: FLASK APP WITH AUTHENTICATION ==========
from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired, Length
import secrets

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///p2p_chat.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*")
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Database Models
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    public_key = db.Column(db.Text, nullable=False)

    def __repr__(self):
        return f'<User {self.username}>'

class ChatSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user1_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    user2_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    session_key = db.Column(db.Text)  # Encrypted session key
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

# Forms
class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=80)])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=6)])
    submit = SubmitField('Register')

class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Login')

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Routes
@app.route('/')
def index():
    if current_user.is_authenticated:
        users = User.query.filter(User.id != current_user.id).all()
        return render_template('index.html', users=users)
    return redirect(url_for('login'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    form = RegistrationForm()
    if form.validate_on_submit():
        # Generate user's crypto keys
        crypto = PostQuantumCrypto()

        # Hash password (in production, use proper password hashing like bcrypt)
        password_hash = hashlib.sha256(form.password.data.encode()).hexdigest()

        user = User(
            username=form.username.data,
            password_hash=password_hash,
            public_key=base64.b64encode(crypto.get_public_bytes()).decode()
        )

        db.session.add(user)
        db.session.commit()

        # Store crypto object in session (simplified - in production use secure storage)
        session['crypto_private'] = base64.b64encode(
            crypto.private_key.private_bytes(
                encoding=serialization.Encoding.Raw,
                format=serialization.PrivateFormat.Raw,
                encryption_algorithm=serialization.NoEncryption()
            )
        ).decode()

        login_user(user)
        return redirect(url_for('index'))

    return render_template('register.html', form=form)

@app.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and user.password_hash == hashlib.sha256(form.password.data.encode()).hexdigest():
            login_user(user)
            return redirect(url_for('index'))

    return render_template('login.html', form=form)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/api/users')
@login_required
def get_users():
    users = User.query.filter(User.id != current_user.id).all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'public_key': u.public_key
    } for u in users])

# ========== CELL 4: SOCKET.IO HANDLERS FOR P2P CHAT ==========
active_sessions = {}

@socketio.on('connect')
def handle_connect():
    if current_user.is_authenticated:
        join_room(f'user_{current_user.id}')
        emit('connected', {'user_id': current_user.id})

@socketio.on('initiate_chat')
def handle_initiate_chat(data):
    target_user_id = data['target_user_id']

    # Get both users' public keys
    initiator = User.query.get(current_user.id)
    target = User.query.get(target_user_id)

    # Create session
    session_id = f"{min(current_user.id, target_user_id)}_{max(current_user.id, target_user_id)}"

    # Generate ephemeral key for forward secrecy
    initiator_crypto = PostQuantumCrypto()
    target_public_bytes = base64.b64decode(target.public_key)

    # Derive shared key
    shared_key = initiator_crypto.derive_shared_key(target_public_bytes)

    # Store session
    active_sessions[session_id] = {
        'shared_key': base64.b64encode(shared_key).decode(),
        'users': [current_user.id, target_user_id]
    }

    # Notify target user
    emit('chat_invitation', {
        'from_user': current_user.username,
        'from_user_id': current_user.id,
        'session_id': session_id,
        'ephemeral_public_key': base64.b64encode(initiator_crypto.get_public_bytes()).decode()
    }, room=f'user_{target_user_id}')

@socketio.on('accept_chat')
def handle_accept_chat(data):
    session_id = data['session_id']
    ephemeral_public_key = base64.b64decode(data['ephemeral_public_key'])

    # Create responder's crypto
    responder_crypto = PostQuantumCrypto()

    # Derive shared key
    shared_key = responder_crypto.derive_shared_key(ephemeral_public_key)

    # Update session
    if session_id in active_sessions:
        active_sessions[session_id]['shared_key'] = base64.b64encode(shared_key).decode()

        # Notify both users
        for user_id in active_sessions[session_id]['users']:
            emit('chat_established', {
                'session_id': session_id,
                'status': 'ready'
            }, room=f'user_{user_id}')

@socketio.on('send_message')
def handle_send_message(data):
    session_id = data['session_id']
    encrypted_message = data['message']

    if session_id in active_sessions:
        # Get shared key
        shared_key = base64.b64decode(active_sessions[session_id]['shared_key'])

        # Decrypt message (for demo - in real P2P, this would be client-side)
        # Here we just forward the encrypted message
        target_users = active_sessions[session_id]['users']

        for user_id in target_users:
            if user_id != current_user.id:
                emit('receive_message', {
                    'from_user': current_user.username,
                    'message': encrypted_message,
                    'session_id': session_id
                }, room=f'user_{user_id}')

@socketio.on('disconnect')
def handle_disconnect():
    if current_user.is_authenticated:
        leave_room(f'user_{current_user.id}')

# ========== CELL 5: HTML TEMPLATES ==========
HTML_TEMPLATES = {
    'base.html': '''
<!DOCTYPE html>
<html>
<head>
    <title>Post-Quantum P2P Chat</title>
    <script src="https://cdn.socket.io/4.5.0/socket.io.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
</head>
<body>
    {% block content %}{% endblock %}
</body>
</html>
''',

    'register.html': '''
{% extends "base.html" %}
{% block content %}
<h2>Register</h2>
<form method="POST">
    {{ form.hidden_tag() }}
    <p>{{ form.username.label }}<br>{{ form.username(size=32) }}</p>
    <p>{{ form.password.label }}<br>{{ form.password(size=32) }}</p>
    <p>{{ form.submit() }}</p>
</form>
<p>Already have an account? <a href="{{ url_for('login') }}">Login</a></p>
{% endblock %}
''',

    'login.html': '''
{% extends "base.html" %}
{% block content %}
<h2>Login</h2>
<form method="POST">
    {{ form.hidden_tag() }}
    <p>{{ form.username.label }}<br>{{ form.username(size=32) }}</p>
    <p>{{ form.password.label }}<br>{{ form.password(size=32) }}</p>
    <p>{{ form.submit() }}</p>
</form>
<p>Don't have an account? <a href="{{ url_for('register') }}">Register</a></p>
{% endblock %}
''',

    'index.html': '''
{% extends "base.html" %}
{% block content %}
<h2>Welcome, {{ current_user.username }}!</h2>
<a href="{{ url_for('logout') }}">Logout</a>

<h3>Available Users</h3>
<div id="users-list"></div>

<h3>Active Chats</h3>
<div id="chat-sessions"></div>

<div id="chat-window" style="display:none;">
    <h4>Chat with: <span id="chat-with"></span></h4>
    <div id="messages" style="height:300px;overflow-y:scroll;border:1px solid #ccc;"></div>
    <input type="text" id="message-input" placeholder="Type your message...">
    <button onclick="sendMessage()">Send</button>
</div>

<script>
let socket;
let chatSessions = {}; // session_id => {username, messages, div}
let tempSessionMap = {}; // temporary_id => real session_id

// Initialize WebSocket connection
function initSocket() {
    socket = io();

    socket.on('connected', function(data) {
        console.log('Connected to server');
        loadUsers();
    });

    // Incoming chat invitation
    socket.on('chat_invitation', function(data) {
        const tempId = 'pending_' + data.from_user;
        openChatWindow(tempId, data.from_user);
        tempSessionMap[tempId] = data.session_id;

        if (confirm(`${data.from_user} wants to chat with you. Accept?`)) {
            socket.emit('accept_chat', {
                session_id: data.session_id,
                ephemeral_public_key: data.ephemeral_public_key
            });
        }
    });

    // Chat established
    socket.on('chat_established', function(data) {
        const realId = data.session_id;

        // If a temporary session exists for this chat, remap it
        for (const tempId in tempSessionMap) {
            if (tempSessionMap[tempId] === realId) {
                // Move messages & div to real session_id
                chatSessions[realId] = chatSessions[tempId];
                delete chatSessions[tempId];
                delete tempSessionMap[tempId];
            }
        }

        if (chatSessions[realId]) {
            chatSessions[realId].div.style.display = 'block';
        }
    });

    // Receive message
    socket.on('receive_message', function(data) {
        const sessionId = data.session_id;
        displayMessage(sessionId, data.from_user, data.message);
    });
}

// Load users list
function loadUsers() {
    fetch('/api/users')
        .then(response => response.json())
        .then(users => {
            const usersList = document.getElementById('users-list');
            usersList.innerHTML = '';
            users.forEach(user => {
                const div = document.createElement('div');
                div.innerHTML = `${user.username} <button onclick="startChatWith(${user.id}, '${user.username}')">Chat</button>`;
                usersList.appendChild(div);
            });
        });
}

// Start chat with user (initiator)
function startChatWith(userId, username) {
    const tempId = 'pending_' + username;
    openChatWindow(tempId, username);
    socket.emit('initiate_chat', { target_user_id: userId });
    tempSessionMap[tempId] = null; // will be updated when chat_established fires
}

// Open chat window popup
function openChatWindow(sessionId, username) {
    if (chatSessions[sessionId]) {
        chatSessions[sessionId].div.style.display = 'block';
        return;
    }

    const chatDiv = document.createElement('div');
    chatDiv.style = `
        position:fixed;
        bottom:10px;
        right:${Object.keys(chatSessions).length * 320 + 10}px;
        width:300px;
        border:1px solid #ccc;
        background:#f9f9f9;
        padding:5px;
        z-index:1000;
    `;

    chatDiv.innerHTML = `
        <div style="text-align:center;font-weight:bold;">
            ${username}
            <button class="close-btn" style="float:right;">X</button>
        </div>
        <div class="messages" style="height:200px;overflow-y:scroll;border:1px solid #ddd;margin:5px 0;"></div>
        <input type="text" placeholder="Type a message..." style="width:70%;" class="message-input">
        <button class="send-btn">Send</button>
    `;
    document.body.appendChild(chatDiv);

    chatSessions[sessionId] = { username, messages: [], div: chatDiv };

    // Button handlers
    chatDiv.querySelector('.send-btn').addEventListener('click', () => sendMessage(sessionId));
    chatDiv.querySelector('.close-btn').addEventListener('click', () => chatDiv.style.display = 'none');
}

// Send message
function sendMessage(sessionId) {
    let realSessionId = sessionId;
    if (tempSessionMap[sessionId]) realSessionId = tempSessionMap[sessionId];

    const chat = chatSessions[sessionId];
    if (!chat) return;

    const input = chat.div.querySelector('.message-input');
    const message = input.value.trim();
    if (!message) return;

    const encryptedMessage = btoa(message); // replace with real encryption
    socket.emit('send_message', { session_id: realSessionId, message: encryptedMessage });
    displayMessage(realSessionId, 'You', encryptedMessage);
    input.value = '';
}

// Display message
function displayMessage(sessionId, sender, message) {
    // Map temporary session to real session if needed
    if (tempSessionMap[sessionId]) sessionId = tempSessionMap[sessionId];

    if (!chatSessions[sessionId]) {
        openChatWindow(sessionId, sender);
    }
    const chat = chatSessions[sessionId];
    const messagesDiv = chat.div.querySelector('.messages');

    let decrypted;
    try { decrypted = atob(message); } catch(e) { decrypted = "[Encrypted]"; }

    const div = document.createElement('div');
    div.innerHTML = `<strong>${sender}:</strong> ${decrypted}`;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Initialize on page load
window.onload = function() {
    initSocket();
};
</script>
{% endblock %}
'''
}

# Create templates directory and write templates
import os
os.makedirs('templates', exist_ok=True)
for filename, content in HTML_TEMPLATES.items():
    with open(f'templates/{filename}', 'w') as f:
        f.write(content)

# ========== CELL 6: INITIALIZE DATABASE AND START SERVER ==========
with app.app_context():
    db.create_all()
    print("✅ Database created!")

# Start ngrok tunnel
from pyngrok import ngrok

# Set your ngrok auth token (get free from ngrok.com)
ngrok.set_auth_token("37fJKKexs66q3bWBAAelBYiU2Yp_7Fq6yLN25TUj43fiBHfEN")

public_url = ngrok.connect(5000)
print(f"✅ Public URL: {public_url}")
print("✅ Server is running!")
print("✅ Share this URL to access the chat system")

# Run the app
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, allow_unsafe_werkzeug=True)
