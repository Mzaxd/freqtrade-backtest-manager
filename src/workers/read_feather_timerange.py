import sys
import pandas as pd
import json

def get_feather_timerange(file_path):
    try:
        df = pd.read_feather(file_path)
        if not df.empty and 'date' in df.columns:
            # Freqtrade stores dates as UTC timestamps in milliseconds
            start_time = df['date'].iloc[0].isoformat()
            end_time = df['date'].iloc[-1].isoformat()
            result = {
                "startTime": start_time,
                "endTime": end_time
            }
            print(json.dumps(result))
        else:
            print(json.dumps({"error": "File is empty or 'date' column is missing"}), file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python read_feather_timerange.py <file_path>"}), file=sys.stderr)
        sys.exit(1)
    
    file_path = sys.argv[1]
    get_feather_timerange(file_path)