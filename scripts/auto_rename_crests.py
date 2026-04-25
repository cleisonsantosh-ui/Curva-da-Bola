import os
import json
import requests
import re
import shutil

# Configuration
API_KEY = "999d134e9c533f8befbfa34d20d204a1"
API_BASE = "https://v3.football.api-sports.io"
SRC_DIR = "escudo_sem_nome"
DEST_DIR = os.path.join("assets", "escudos")
MAP_FILE = "crest_map.json"

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9]', '_', text)
    return re.sub(r'_+', '_', text).strip('_')

def get_team_info(tid, headers):
    try:
        res = requests.get(f"{API_BASE}/teams?id={tid}", headers=headers)
        d = res.json()
        if d.get("response"):
            return d["response"][0]["team"]
    except Exception as e:
        print(f"Error fetching ID {tid}: {e}")
    return None

def main():
    if not os.path.exists(DEST_DIR):
        os.makedirs(DEST_DIR)
        
    headers = {"x-apisports-key": API_KEY}
    
    # Load mapping
    if os.path.exists(MAP_FILE):
        with open(MAP_FILE, 'r', encoding='utf-8') as f:
            crest_map = json.load(f)
    else:
        crest_map = {}
        
    files = os.listdir(SRC_DIR)
    success_count = 0
    memo = {}

    print(f"Processing {len(files)} files. Using LAST number sequence logic...")

    for f in files:
        if f == "crest_map.json" or f.endswith(".md"): continue
        
        # Extract the LAST number sequence before the extension
        match = re.search(r'(\d+)\.(png|jpg|jpeg|gif)$', f)
        if not match:
            # Try finding any numbers if no match at the end
            nums = re.findall(r'\d+', f)
            if nums:
                used_id = nums[-1]
            else:
                continue
        else:
            used_id = match.group(1)
            
        if used_id in memo:
            info = memo[used_id]
        else:
            info = get_team_info(used_id, headers)
            memo[used_id] = info
            
        if info:
            name = info["name"]
            slug = slugify(name)
            ext = f.split('.')[-1]
            new_filename = f"imgi_{used_id}_{slug}.{ext}"
            
            src_path = os.path.join(SRC_DIR, f)
            dest_path = os.path.join(DEST_DIR, new_filename)
            
            try:
                shutil.move(src_path, dest_path)
                crest_map[slug] = new_filename
                success_count += 1
                print(f"Moved: {f} -> {new_filename}")
            except Exception as e:
                print(f"Error moving {f}: {e}")
        else:
            print(f"Could not identify ID {used_id} for: {f}")
                
    # Save updated mapping
    with open(MAP_FILE, 'w', encoding='utf-8') as f:
        json.dump(crest_map, f, indent=2, ensure_ascii=False)
        
    print(f"Done! Moved {success_count} images.")

if __name__ == "__main__":
    main()
