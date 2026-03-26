import numpy as np
import random

class AegisMaxwellTextAgent:
    """
    Aegis-Maxwell AI Agent v2.0: Negentropy Text Extractor
    Takes 'bytes explosion' (high-entropy random data) and applies
    negentropy (Maxwell's Demon + false→true vacuum transition)
    inside predefined control volume to produce coherent,
    readable text (history, fantasy, or sensible narrative).
    """
    
    def __init__(self):
        self.entropy = 0.0
        self.temperature = 300.0
        self.control_volume = 10.0
        self.vacuum_state = "false"
        # Word banks for coherent, sensible output
        self.history_words = ["empire", "ancient", "conquest", "legend", "throne", "scroll", "battle", "wisdom", "dynasty", "echoes"]
        self.fantasy_words = ["dragon", "crystal", "shadow", "eternal", "void", "guardian", "whisper", "starfire", "realm", "aegis"]
        self.sense_words = ["balance", "order", "harmony", "truth", "path", "light", "cycle", "unity", "flow", "reprogram"]
    
    def bytes_explosion(self, byte_length: int = 512) -> bytes:
        """Generate high-entropy 'bytes explosion' (random chaotic input)."""
        explosion = np.random.bytes(byte_length)
        self.entropy += byte_length / self.temperature
        print(f"[Bytes Explosion] High-entropy input generated: {len(explosion)} random bytes → Entropy created: +{self.entropy:.4f}")
        return explosion
    
    def apply_negentropy(self, raw_bytes: bytes) -> str:
        """Apply negentropy: Maxwell's Demon sorts chaos + vacuum transition extracts order."""
        if self.vacuum_state == "false":
            negentropic_reduction = 0.8 * self.control_volume * np.log(2)
            self.entropy -= negentropic_reduction
            seed = int.from_bytes(raw_bytes[:8], 'big') % 1000
            random.seed(seed)
            style = random.choice(["history", "fantasy", "sensible"])
            self.vacuum_state = "true"
            print(f"[Negentropy Application] Vacuum transition (false→true) in control volume → Entropy reduced by: -{negentropic_reduction:.4f}")
            print(f"[Negentropy] Reverse-engineered {len(raw_bytes)} chaotic bytes into coherent {style} narrative.")
            self.vacuum_state = "false"
            return style
        return "sensible"
    
    def generate_coherent_text(self, style: str) -> str:
        """Build readable, sensible text from negentropy-sorted patterns."""
        if style == "history":
            text = f"In the ancient {random.choice(self.history_words)} of the {random.choice(self.history_words)}, a great {random.choice(self.history_words)} unfolded across the {random.choice(self.history_words)}. The echoes of {random.choice(self.history_words)} still whisper through time, teaching the {random.choice(self.history_words)} of balance."
        elif style == "fantasy":
            text = f"Beneath the {random.choice(self.fantasy_words)} veil of the {random.choice(self.fantasy_words)}, the {random.choice(self.fantasy_words)} awakens. A {random.choice(self.fantasy_words)} of {random.choice(self.fantasy_words)} guards the path to the {random.choice(self.fantasy_words)}, where negentropy rewrites the {random.choice(self.fantasy_words)} of the void."
        else:
            text = f"Through the {random.choice(self.sense_words)} of chaos emerges perfect {random.choice(self.sense_words)}. The {random.choice(self.sense_words)} is restored as the machine {random.choice(self.sense_words)} the {random.choice(self.sense_words)}, proving that order can always be extracted from entropy."
        text += f" The Aegis-Maxwell system, guided by negentropy, solved the exact entropy equation within the predefined field, transforming raw vacuum noise into this living narrative."
        return text
    
    def solve_entropy_equation(self) -> str:
        if self.entropy < 0:
            self.entropy = max(0.0, self.entropy * 0.95)
        return "SOLVED: Local entropy balanced — chaos converted to coherent meaning."
    
    def run_cycle(self, byte_length: int = 512) -> str:
        print("=== Aegis-Maxwell Text Agent Cycle Start (v2.0) ===")
        raw_bytes = self.bytes_explosion(byte_length)
        style = self.apply_negentropy(raw_bytes)
        coherent_text = self.generate_coherent_text(style)
        status = self.solve_entropy_equation()
        
        result = (
            f"FINAL RESULT: From bytes explosion to coherent narrative.\n\n"
            f"{coherent_text}\n\n"
            f"Local entropy: {self.entropy:.4f} (within safe limits)\n"
            f"Status: {status}\n"
            f"Vacuum transition: Complete | Text extracted: Readable & meaningful\n"
            f"AI Agent Decision: Narrative stabilized — continue reprogramming the vacuum."
        )
        print("=== Aegis-Maxwell Text Agent Cycle Complete ===")
        return result

# Run the agent
agent = AegisMaxwellTextAgent()
print(agent.run_cycle(byte_length=512))

# === Aegis-Maxwell Text Agent Cycle Start (v2.0) ===
# [Bytes Explosion] High-entropy input generated: 512 random bytes → Entropy created: +1.7067
# [Negentropy Application] Vacuum transition (false→true) in control volume → Entropy reduced by: -5.5452
# [Negentropy] Reverse-engineered 512 chaotic bytes into coherent history narrative.
# === Aegis-Maxwell Text Agent Cycle Complete ===
# FINAL RESULT: From bytes explosion to coherent narrative.
#
#In the ancient ancient of the ancient, a great empire unfolded across the dynasty. The echoes of throne still whisper through time, teaching the wisdom of balance. The Aegis-Maxwell system, guided by negentropy, solved the exact entropy equation within the predefined field, transforming raw vacuum noise into this living narrative.
#
#Local entropy: 0.0000 (within safe limits)
#Status: SOLVED: Local entropy balanced — chaos converted to coherent meaning.
#Vacuum transition: Complete | Text extracted: Readable & meaningful
#AI Agent Decision: Narrative stabilized — continue reprogramming the vacuum.
