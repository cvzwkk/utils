# sudo apt -y install dos2unix
# dos2unix ollama.sh
# bash ollama.sh

#!/usr/bin/env bash
# =========================================================
# 🧠 AI Manager Lite - 1GB VPS Safe Edition
# Ollama + Telegram Bot + Script Generator
# No OpenClaw. No Node. Lightweight.
# =========================================================

set -e

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m"

BOT_DIR="$HOME/ai-bot"
MODEL_NAME="qwen2.5:0.5b"

print_header() {
    clear
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}        🧠 AI Manager Lite            ${NC}"
    echo -e "${BLUE}      1GB VPS Optimized Stack         ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo ""
}

menu() {
    print_header
    echo "1. Uninstall OpenClaw + Node"
    echo "2. Install Ollama (Standalone)"
    echo "3. Install 1GB Safe Model"
    echo "4. Setup Telegram Bot (Python)"
    echo "5. Start Ollama"
    echo "6. Start Telegram Bot"
    echo "0. Exit"
    echo ""
    read -rp "Choose: " choice
}

uninstall_openclaw() {
    echo -e "${YELLOW}Removing OpenClaw + Node...${NC}"
    pkill -f openclaw 2>/dev/null || true
    rm -rf ~/.openclaw
    sudo rm -f /usr/local/bin/openclaw 2>/dev/null || true
    sudo apt remove -y nodejs npm 2>/dev/null || true
    echo -e "${GREEN}OpenClaw removed.${NC}"
}

install_ollama() {
    echo -e "${YELLOW}Installing Ollama...${NC}"
    curl -fsSL https://ollama.com/install.sh | sh
    echo -e "${GREEN}Ollama installed.${NC}"
}

install_model() {
    echo -e "${YELLOW}Installing lightweight model...${NC}"
    ollama pull $MODEL_NAME
    echo -e "${GREEN}Model installed: $MODEL_NAME${NC}"
}

setup_telegram_bot() {
    echo -e "${YELLOW}Telegram Bot Setup${NC}"
    echo "Create bot via @BotFather and paste token:"
    read -rp "Token: " TOKEN

    mkdir -p $BOT_DIR

    cat > $BOT_DIR/bot.py <<EOF
import requests
import os
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, ContextTypes, filters

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "$MODEL_NAME"

async def handle(update: Update, context: ContextTypes.DEFAULT_TYPE):
    prompt = update.message.text

    if "python" in prompt.lower():
        prompt = "Generate a complete Python script:\\n" + prompt
    if "bash" in prompt.lower() or "shell" in prompt.lower():
        prompt = "Generate a complete Bash script:\\n" + prompt

    response = requests.post(OLLAMA_URL, json={
        "model": MODEL,
        "prompt": prompt,
        "stream": False
    })

    result = response.json()["response"]
    await update.message.reply_text(result[:4000])

app = ApplicationBuilder().token("$TOKEN").build()
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle))
app.run_polling()
EOF

    #python3 -m pip install --upgrade pip
    pip3 install python-telegram-bot requests --break-system-packages

    echo -e "${GREEN}Telegram bot configured.${NC}"
}

start_ollama() {
    echo -e "${GREEN}Starting Ollama...${NC}"
    nohup ollama serve > /dev/null 2>&1 &
    sleep 2
    echo "Ollama running on port 11434"
}

start_bot() {
    echo -e "${GREEN}Starting Telegram Bot...${NC}"
    cd $BOT_DIR
    nohup python3 bot.py > bot.log 2>&1 &
    echo "Bot started."
}

while true; do
    menu
    case "$choice" in
        1) uninstall_openclaw ;;
        2) install_ollama ;;
        3) install_model ;;
        4) setup_telegram_bot ;;
        5) start_ollama ;;
        6) start_bot ;;
        0) exit 0 ;;
        *) echo "Invalid option" ;;
    esac
    read -rp "Press Enter..."
done
