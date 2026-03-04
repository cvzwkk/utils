# apt -y install dos2unix
# dos2unix openclaw.sh
# bash openclaw.sh

#!/usr/bin/env bash
# ==================================================
# 🦞 OpenClaw Manager v3.0 - Linux Clean Edition
# ==================================================

set -e

# ---------- COLORS ----------
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m"

OPENCLAW_DIR="$HOME/.openclaw"
WORKSPACE="$OPENCLAW_DIR/workspace"

# ---------- HEADER ----------
print_header() {
    clear
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                🦞 OpenClaw Manager v3.0                   ║${NC}"
    echo -e "${BLUE}║            ONE MENU TO MANAGE EVERYTHING                  ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# ---------- MENU ----------
menu() {
    print_header
    echo -e "${YELLOW}Main Menu:${NC}"
    echo "1.  Install / Reinstall OpenClaw"
    echo "2.  Install Ollama + Coding Models"
    echo "3.  Configure Telegram Bot"
    echo "4.  Create New Agent"
    echo "5.  Edit Current Agent Rules"
    echo "6.  Start Gateway"
    echo "7.  Restart Gateway"
    echo "8.  Stop Gateway"
    echo "9.  Gateway Status"
    echo "10. Model Management"
    echo "11. Open Workspace Folder"
    echo "12. Backup Config"
    echo "13. Update OpenClaw"
    echo "0.  Exit"
    echo ""
    read -rp "Choose [0-13]: " choice
}

# ---------- FUNCTIONS ----------

install_openclaw() {
    echo -e "${GREEN}Installing latest OpenClaw...${NC}"
    curl -fsSL https://openclaw.ai/install.sh | bash
}

install_ollama_models() {
    echo -e "${YELLOW}Installing Ollama + models...${NC}"

    if ! command -v ollama >/dev/null 2>&1; then
        curl -fsSL https://ollama.com/install.sh | sh
    fi

    ollama pull qwen2.5-coder:14b
    ollama pull deepseek-coder-v2:16b
    ollama pull glm4:9b
    ollama pull codegemma:7b

    echo -e "${GREEN}✅ All models installed!${NC}"
}

setup_telegram() {
    echo -e "${YELLOW}Telegram Bot Setup${NC}"
    echo "1. Open Telegram → @BotFather"
    echo "2. Run /newbot and copy token"
    read -rp "Paste token here: " token

    if [[ -n "$token" ]]; then
        mkdir -p "$OPENCLAW_DIR"

        cat > "$OPENCLAW_DIR/openclaw.json" <<EOF
{
  "agent": {
    "model": "ollama/qwen2.5-coder:14b",
    "temperature": 0.25
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "$token"
    }
  }
}
EOF
        echo -e "${GREEN}✅ Telegram configured!${NC}"
    else
        echo -e "${RED}Token cannot be empty.${NC}"
    fi
}

create_new_agent() {
    mkdir -p "$WORKSPACE"

    echo -e "${YELLOW}Select Agent Personality:${NC}"
    echo "1. PythonClaw"
    echo "2. BashClaw"
    echo "3. ScrapeClaw"
    echo "4. DataClaw"
    echo "5. ReviewClaw"
    echo "6. GeneralClaw"

    read -rp "Choose (1-6): " p

    case "$p" in
        1) name="PythonClaw"
           desc="Generate complete Python 3.12+ scripts with shebang, argparse, logging."
           ;;
        2) name="BashClaw"
           desc="Expert in safe Bash/Zsh automation."
           ;;
        3) name="ScrapeClaw"
           desc="Specialist in web scraping and browser automation."
           ;;
        4) name="DataClaw"
           desc="Expert in Pandas, Polars, and visualization."
           ;;
        5) name="ReviewClaw"
           desc="Senior security-focused code reviewer."
           ;;
        6) name="GeneralClaw"
           desc="General-purpose assistant."
           ;;
        *)
           echo -e "${RED}Invalid selection.${NC}"
           return
           ;;
    esac

    cat > "$WORKSPACE/AGENTS.md" <<EOF
You are **$name**.

$desc

CORE RULES:
- Be concise and professional.
- Save files automatically in ~/projects/$name/
- Full shell/file/browser access.
EOF

    echo -e "${GREEN}✅ Agent '$name' activated!${NC}"
}

start_gateway() {
    openclaw gateway
}

restart_gateway() {
    pkill -f openclaw 2>/dev/null || true
    sleep 1
    openclaw gateway
}

stop_gateway() {
    pkill -f openclaw && echo -e "${GREEN}✅ Gateway stopped.${NC}"
}

gateway_status() {
    if pgrep -f openclaw >/dev/null; then
        echo -e "${GREEN}Gateway running.${NC}"
    else
        echo -e "${RED}Gateway not running.${NC}"
    fi
}

model_management() {
    ollama list
    echo ""
    read -rp "Pull new model (or press Enter to skip): " model
    [[ -n "$model" ]] && ollama pull "$model"
}

open_workspace() {
    mkdir -p "$WORKSPACE"
    echo "Workspace: $WORKSPACE"
}

backup_config() {
    if [[ -d "$OPENCLAW_DIR" ]]; then
        backup_name="${OPENCLAW_DIR}-backup-$(date +%F)"
        cp -r "$OPENCLAW_DIR" "$backup_name"
        echo -e "${GREEN}✅ Backup created at $backup_name${NC}"
    else
        echo -e "${RED}OpenClaw directory not found.${NC}"
    fi
}

update_openclaw() {
    curl -fsSL https://openclaw.ai/install.sh | bash
}

# ---------- MAIN LOOP ----------

while true; do
    menu
    case "$choice" in
        1) install_openclaw ;;
        2) install_ollama_models ;;
        3) setup_telegram ;;
        4) create_new_agent ;;
        5) ${EDITOR:-nano} "$WORKSPACE/AGENTS.md" ;;
        6) start_gateway ;;
        7) restart_gateway ;;
        8) stop_gateway ;;
        9) gateway_status ;;
        10) model_management ;;
        11) open_workspace ;;
        12) backup_config ;;
        13) update_openclaw ;;
        0) echo -e "${BLUE}Goodbye! 🦞${NC}"; exit 0 ;;
        *) echo -e "${RED}Invalid option.${NC}" ;;
    esac
    echo ""
    read -rp "Press Enter to continue..."
done
