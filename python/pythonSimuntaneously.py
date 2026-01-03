import subprocess
import sys
import time

# List the filenames of the scripts you want to run
SCRIPTS = [
    "backtest_long.py",
    "backtest_short.py",
    "live_trader.py"
]

def run_all_simultaneously():
    processes = []

    print(f"--- Starting {len(SCRIPTS)} scripts simultaneously ---")

    for script in SCRIPTS:
        # sys.executable ensures it uses the same Python environment
        p = subprocess.Popen([sys.executable, script])
        processes.append(p)
        print(f"Started: {script} (PID: {p.pid})")

    print("-" * 40)
    print("All scripts are running. Press Ctrl+C to stop all.")

    try:
        # Keep the manager script alive while children run
        while True:
            time.sleep(1)
            
            # Optional: Check if processes are still alive
            for i, p in enumerate(processes):
                if p.poll() is not None: # Returns None if still running
                    print(f"Notice: {SCRIPTS[i]} has finished or crashed.")
                    processes.pop(i)
                    
    except KeyboardInterrupt:
        print("\nStopping all scripts...")
        for p in processes:
            p.terminate() # Gracefully close scripts
        print("Done.")

if __name__ == "__main__":
    run_all_simultaneously()
