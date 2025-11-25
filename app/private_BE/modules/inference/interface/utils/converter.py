import base64

import cv2
import numpy as np
import torch
from PIL import Image


def cv2_to_data_url(img, format: str = "PNG") -> str:

    bgr = _to_bgr_uint8(img)

    ext = format.lower()
    if ext == "jpg":
        ext = "jpeg"
    ok, enc = cv2.imencode(f".{ext}", bgr)
    if not ok:
        raise RuntimeError(f"cv2.imencode failed for format .{ext}")


    b64 = base64.b64encode(enc.tobytes()).decode("ascii")
    mime = "image/png" if ext == "png" else "image/jpeg"
    return f"data:{mime};base64,{b64}"

def _to_bgr_uint8(img) -> np.ndarray:

    if isinstance(img, Image.Image):
        img = np.array(img)  # RGB
        if img.ndim == 2:  # grayscale
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        else:
            img = img[:, :, ::-1]  # RGB->BGR

    if isinstance(img, torch.Tensor):
        img = img.detach().cpu().numpy()

    if not isinstance(img, np.ndarray):
        img = np.array(img)

    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    elif img.ndim == 3 and img.shape[2] == 4:
        # BGRA/ RGBA -> BGR
        img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR) if img.dtype == np.uint8 else img[:, :, :3]

    if img.dtype != np.uint8:
        mx = float(np.nanmax(img)) if img.size else 0.0
        if mx <= 1.0:
            img = (np.clip(img, 0, 1) * 255.0).astype(np.uint8)
        else:
            img = np.clip(img, 0, 255).astype(np.uint8)

    img = np.ascontiguousarray(img)
    return img


def pil_to_data_url(img: Image.Image, fmt: str = "PNG") -> str:
    if isinstance(img, list):
        if len(img) == 1 and isinstance(img[0], Image.Image):
            img = img[0]
        else:
            raise TypeError(f"Expected single PIL.Image.Image, got list: len={len(img)}")
    if not isinstance(img, Image.Image):
        raise TypeError(f"Expected PIL.Image.Image, got {type(img)}")

    buf = io.BytesIO()
    img.save(buf, format=fmt)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    mime = "image/png" if fmt.upper() == "PNG" else f"image/{fmt.lower()}"
    return f"data:{mime};base64,{b64}"
  

def pil_to_streaming_response(img: Image.Image, fmt: str = "PNG"):
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    buf.seek(0)
    mime = "image/png" if fmt.upper() == "PNG" else f"image/{fmt.lower()}"
