from PIL import Image
import json
import pytesseract

data = json.load(open("mapping.json"))

def get_combinations(data):
    output = []
    for url_key in data["urls"]:
        for slice_key in data["slices"]:
            for position_key in data["positions"]:
                output.append(f"{url_key} {slice_key} {position_key}")
    return output

def extract_key(key):
    key.split(" ")
    url_key = None
    slice_key = None
    position_key = None
    for k in key.split(" "):
        if k in data["urls"]:
            url_key = k
        elif k in data["slices"]:
            slice_key = k
        elif k in data["positions"]:
            position_key = k
    return url_key, slice_key, position_key

def extract_coordinates(position):
    """ Convert 'background-position' to x, y coordinates """
    x, y = map(lambda v: int(v.replace("px", "")), position.split())
    return abs(x), abs(y)  # Ensure positive values

def process_image_for_ocr(image):
    """ Preprocess image to improve OCR accuracy """
    # Convert to grayscale
    image = image.convert("L")

    # Apply binary thresholding (make text stand out)
    image = image.point(lambda p: 255 if p > 128 else 0)

    return image

def analyse_crop(image_path, slice_key, position_key, output_image_path):
    """ Open an image, crop based on slice and position """
    if slice_key not in data["slices"]:
        print(f"Slice {slice_key} not found!")
        return
    
    img = Image.open(image_path)
    
    # Extract coordinates from slice
    slice_coords = extract_coordinates(data["slices"][slice_key]["background-position"])
    
    # Extract width and height from positions
    if position_key not in data["positions"]:
        print(f"Position {position_key} not found!")
        return
    
    pos_width = int(data["positions"][position_key]["width"].replace("px", ""))
    pos_height = int(data["positions"][position_key]["height"].replace("px", ""))
    
    # Crop the image based on slice coordinates and width/height
    cropped = img.crop((slice_coords[0], slice_coords[1], slice_coords[0] + pos_width, slice_coords[1] + pos_height))
    
    # Save the processed image
    cropped.save(output_image_path)

    # Run OCR
    extracted_text = pytesseract.image_to_string(cropped, config="--psm 6")
    return extracted_text
    
def __main__():
    combinations = get_combinations(data)
    
    output_json = {}
    
    for combination in combinations:
        url_key, slice_key, position_key = extract_key(combination)

        image_path = data["urls"].get(url_key, "")
        output_image_path = f"output_images/{combination}.jpg"

        if image_path:
            extract_text = analyse_crop(image_path, slice_key, position_key, output_image_path)
            output_json[combination] = extract_text
        else:
            print("Image key not found!")
            
    with open("output.json", "w") as f:
        json.dump(output_json, f, indent=2)
        
__main__()