#!/bin/bash
# apt-get install -y libbpf-devel linux-headers clang llvm
# Configuration
INTERFACE="wlan0"
BPF_OBJ="firewall.bpf.o"
BPF_SRC="firewall.bpf.c"

# Color Codes for Output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0;0m'

function compile_program() {
    echo -e "${GREEN}[*] Compiling eBPF program...${NC}"
    # Target bpf architectures, compile with optimizations turned on (-O2 required by eBPF verifier)
    clang -g -O2 -target bpf -D__TARGET_ARCH_x86 -c "$BPF_SRC" -o "$BPF_OBJ"
    if [ $? -ne 0 ]; then
        echo -e "${RED}[!] Compilation failed.${NC}"
        exit 1
    fi
}

function deploy_firewall() {
    echo -e "${GREEN}[*] Injecting XDP Ingress engine into $INTERFACE...${NC}"
    sudo ip link set dev "$INTERFACE" xdp obj "$BPF_OBJ" sec xdp

    echo -e "${GREEN}[*] Constructing Traffic Control (TC) egress discipline structure...${NC}"
    # Create clsact queuing discipline to enable parsing egress via filter infrastructure
    sudo tc qdisc add dev "$INTERFACE" clsact 2>/dev/null || true
    
    echo -e "${GREEN}[*] Binding TC Egress logic filter inline...${NC}"
    sudo tc filter add dev "$INTERFACE" egress bpf da obj "$BPF_OBJ" sec tc
    
    echo -e "${GREEN}[+] Stateful In-Thread Firewall is online!${NC}"
}

function dismantle_firewall() {
    echo -e "${RED}[*] Unloading XDP programs...${NC}"
    sudo ip link set dev "$INTERFACE" xdp off 2>/dev/null || true
    
    echo -e "${RED}[*] Flushing TC egress scheduler disciplines...${NC}"
    sudo tc qdisc del dev "$INTERFACE" clsact 2>/dev/null || true
    echo -e "${RED}[-] Firewall safely detached.${NC}"
}

# Simple flag switching execution loop
if [ "$1" == "stop" ]; then
    dismantle_firewall
else
    compile_program
    # Ensure a clean interface environment before binding pipelines
    dismantle_firewall &>/dev/null 
    deploy_firewall
fi
