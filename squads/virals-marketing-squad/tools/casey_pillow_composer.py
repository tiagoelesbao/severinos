import os
from PIL import Image, ImageDraw, ImageFont

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def compose_post(config):
    canvas_config = config.get("canvas", {})
    width = canvas_config.get("width", 1080)
    height = canvas_config.get("height", 1080)
    bg_color = canvas_config.get("background", "#FFFFFF")

    base_image = Image.new("RGBA", (width, height), hex_to_rgb(bg_color) + (255,))
    draw = ImageDraw.Draw(base_image)

    for layer in config.get("layers", []):
        l_type = layer.get("type")
        
        if l_type == "image":
            img_path = layer.get("path")
            if img_path and os.path.exists(img_path):
                img_layer = Image.open(img_path).convert("RGBA")
                size = layer.get("size")
                if size:
                    # scale/crop behavior could be complex, for now simple resize
                    img_layer = img_layer.resize(size)
                pos = layer.get("position", (0, 0))
                base_image.alpha_composite(img_layer, pos)
                draw = ImageDraw.Draw(base_image)
                
        elif l_type == "color_overlay":
            color = layer.get("color", "#000000")
            opacity = layer.get("opacity", 0.5)
            overlay = Image.new("RGBA", (width, height), hex_to_rgb(color) + (int(255 * opacity),))
            base_image = Image.alpha_composite(base_image, overlay)
            draw = ImageDraw.Draw(base_image) # Recreate draw object for updated base_image
            
        elif l_type == "text":
            text = layer.get("content", "")
            font_size = layer.get("font_size", 40)
            font_path = layer.get("font", "")
            try:
                font = ImageFont.truetype(font_path, font_size)
            except IOError:
                font = ImageFont.load_default(size=font_size)
            
            color = hex_to_rgb(layer.get("color", "#000000"))
            
            pos = layer.get("position", "center")
            if pos == "center":
                bbox = draw.textbbox((0, 0), text, font=font)
                text_w = bbox[2] - bbox[0]
                text_h = bbox[3] - bbox[1]
                x = (width - text_w) / 2
                y = (height - text_h) / 2
            elif isinstance(pos, (list, tuple)):
                x, y = pos
            else:
                x, y = 100, 100
                
            draw.text((x, y), text, font=font, fill=color)
            
        elif l_type == "vector_element":
            shape = layer.get("shape")
            color = hex_to_rgb(layer.get("color", "#000000"))
            pos = layer.get("position", (0, 0))
            size = layer.get("size", (100, 100))
            
            if shape == "line" or shape == "rectangle":
                draw.rectangle([pos[0], pos[1], pos[0] + size[0], pos[1] + size[1]], fill=color)

    return base_image
