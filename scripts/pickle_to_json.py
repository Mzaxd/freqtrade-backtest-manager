import pickle
import json
import sys
import pandas as pd

def main():
    if len(sys.argv) != 2:
        print("Usage: python pickle_to_json.py <path_to_pickle_file>", file=sys.stderr)
        sys.exit(1)

    pickle_file_path = sys.argv[1]

    try:
        # First try to read as pickle
        with open(pickle_file_path, 'rb') as f:
            try:
                data = pickle.load(f)
            except (pickle.UnpicklingError, ValueError) as pickle_error:
                # If pickle fails, try reading as text (might be JSON or text file)
                f.seek(0)
                try:
                    text_content = f.read().decode('utf-8')
                    # Try to parse as JSON
                    try:
                        data = json.loads(text_content)
                    except json.JSONDecodeError:
                        # If not JSON, return as text
                        data = {"raw_text": text_content}
                except UnicodeDecodeError:
                    raise pickle_error
        
        # Freqtrade hyperopt results are often a list of objects or a dictionary
        # We need to handle pandas DataFrames specifically if they are present
        if isinstance(data, list):
            # Assuming it's a list of dictionaries (common case for hyperopt results)
            # Convert any pandas objects to JSON serializable format
            for i, item in enumerate(data):
                if isinstance(item, pd.DataFrame):
                    data[i] = item.to_dict(orient='records')
                elif isinstance(item, pd.Series):
                    data[i] = item.to_dict()

        elif isinstance(data, pd.DataFrame):
            data = data.to_dict(orient='records')

        # Convert to JSON string
        json_output = json.dumps(data, default=str)
        print(json_output)

    except FileNotFoundError:
        print(f"Error: File not found at {pickle_file_path}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"An error occurred: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()