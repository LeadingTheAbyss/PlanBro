import os
import sys
import traceback
import uvicorn

if __name__ == "__main__":
    # Render provides the port to bind to via the PORT environment variable
    port = int(os.environ.get("PORT", 10000))
    
    try:
        print(f"Starting Uvicorn programmatically on port {port}...", flush=True)
        # We launch uvicorn programmatically to avoid shell interpolation bugs on Render
        uvicorn.run("api:app", host="0.0.0.0", port=port)
    except Exception as e:
        print("CRITICAL ERROR RUNNING UVICORN:", e, flush=True)
        traceback.print_exc()
        sys.exit(1)
