#!/usr/bin/env python3
import os
import sys
import subprocess

INTERFACE = "wlan0"
BPF_C_FILE = "firewall.bpf.c"
OBJ_FILE = "firewall.bpf.o"

def check_requirements():
    if os.getuid() != 0:
        print("[!] Root privileges required to load eBPF components.")
        sys.exit(1)
    for tool in ["clang", "ip", "tc"]:
        if subprocess.call(f"type {tool}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) != 0:
            print(f"[!] Critical dependency missing: {tool}")
            sys.exit(1)

def compile_ebpf():
    print("[*] Compiling map-less eBPF program...")
    cmd = f"clang -O2 -target bpf -c {BPF_C_FILE} -o {OBJ_FILE}"
    if os.system(cmd) != 0:
        print("[!] Compilation failed."); sys.exit(1)

def clean_existing_hooks():
    subprocess.call(f"ip link set dev {INTERFACE} xdp off", shell=True, stderr=subprocess.DEVNULL)
    subprocess.call(f"tc qdisc del dev {INTERFACE} clsact", shell=True, stderr=subprocess.DEVNULL)

def stream_trace_pipe():
    print("\n[+] Firewall online! Streaming live drops from kernel trace_pipe...")
    print("-" * 75)
    
    # Read directly from the system tracing facility
    try:
        with open("/root/trace_pipe", "r") as pipe:
            while True:
                line = pipe.readline().strip()
                if "DROP:" in line:
                    # Clean up kernel context prefix to isolate our custom message
                    clean_log = line.split("DROP:")[1].strip()
                    print(f"[BLOCKED] {clean_log}")
    except PermissionError:
        print("[!] Missing read access to /root/trace_pipe. Are you root?")
    except KeyboardInterrupt:
        pass

def main():
    check_requirements()
    compile_ebpf()
    clean_existing_hooks()

    try:
        print(f"[*] Binding XDP Ingress Hook engine onto {INTERFACE}...")
        if os.system(f"ip link set dev {INTERFACE} xdp object {OBJ_FILE} section xdp") != 0:
            raise Exception("Failed to attach XDP ingress filter.")

        os.system(f"tc qdisc add dev {INTERFACE} clsact")
        os.system(f"tc filter add dev {INTERFACE} egress bpf obj {OBJ_FILE} sec classifier da")

        stream_trace_pipe()

    except Exception as e:
        print(f"\n[!] Critical deployment failure: {e}")
    finally:
        clean_existing_hooks()
        print("[+] Firewall detached. Offline.")

if __name__ == "__main__":
    main()
