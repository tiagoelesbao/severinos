import os
import sys

# Ensure tools can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.casey_pillow_composer import compose_post

def test_hello_world():
    config = {
        "canvas": {"width": 1080, "height": 1080, "background": "#1A1A2E"},
        "layers": [
            {
                "type": "color_overlay",
                "color": "#000000",
                "opacity": 0.2
            },
            {
                "type": "text",
                "content": "HELLO WORLD FROM CASEY",
                "font_size": 80,
                "color": "#FFFFFF",
                "position": "center"
            },
            {
                "type": "vector_element",
                "shape": "rectangle",
                "color": "#FF5B3F",
                "position": (90, 800),
                "size": (900, 10)
            }
        ]
    }
    
    img = compose_post(config)
    output_dir = "outputs"
    os.makedirs(output_dir, exist_ok=True)
    out_path = os.path.join(output_dir, "test_hello_world.png")
    img.save(out_path)
    print(f"Success! Image saved to {out_path}")

if __name__ == "__main__":
    test_hello_world()
