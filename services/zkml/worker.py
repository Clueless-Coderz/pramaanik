import ezkl
import os
import json
import logging

logging.basicConfig(level=logging.INFO)

# EZKL Service (Mock worker loop for Hackathon)
def generate_proof(model_path, data_path, output_path):
    try:
        # Step 1: Export Settings
        settings_path = "settings.json"
        ezkl.gen_settings(model_path, settings_path)
        
        # Step 2: Calibrate
        ezkl.calibrate_settings(data_path, model_path, settings_path, "resources")
        
        # Step 3: Compile Circuit
        compiled_model_path = "network.compiled"
        ezkl.compile_circuit(model_path, compiled_model_path, settings_path)
        
        # Step 4: Setup SRS
        ezkl.get_srs(settings_path)
        
        # Step 5: Setup Proving Key & Verification Key
        ezkl.setup(compiled_model_path, "vk.key", "pk.key")
        
        # Step 6: Generate Witness
        ezkl.gen_witness(data_path, compiled_model_path, "witness.json")
        
        # Step 7: Prove
        ezkl.prove(
            "witness.json",
            compiled_model_path,
            "pk.key",
            output_path,
            "single",
        )
        logging.info(f"Proof generated successfully at {output_path}")
        return True
    except Exception as e:
        logging.error(f"Failed to generate proof: {e}")
        return False

if __name__ == "__main__":
    logging.info("Starting EZKL Proving Service Worker...")
    # In a real environment, this would poll a queue (e.g. Redis/RabbitMQ) for jobs.
