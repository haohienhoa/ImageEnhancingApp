# main.py

import base64
import cv2
import numpy as np
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import Optional

# Pydantic model để validation dữ liệu đầu vào
class ImageRequest(BaseModel):
    image: str
    operation: str
    # Thêm các tham số tùy chọn cho các bộ lọc
    kernel_size: Optional[int] = 5
    canny_threshold1: Optional[int] = 100
    canny_threshold2: Optional[int] = 200

# Khởi tạo ứng dụng FastAPI
app = FastAPI(title="Image Enhancing API")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# --- Các hàm trợ giúp ---
def read_image_from_base64(base64_string: str) -> np.ndarray:
    encoded_data = base64_string.split(',')[1]
    nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def image_to_base64(img: np.ndarray) -> str:
    _, buffer = cv2.imencode('.png', img)
    return "data:image/png;base64," + base64.b64encode(buffer).decode('utf-8')

# --- Các Endpoints ---
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/process")
async def process_image(item: ImageRequest):
    img = read_image_from_base64(item.image)
    processed_img = None
    
    # --- CÁC THAO TÁC CŨ (PIXEL TRANSFORMATION) ---
    if item.operation == 'histogram':
        gray_img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        hist = cv2.calcHist([gray_img], [0], None, [256], [0, 256])
        return {'histogram': hist.flatten().tolist()}
    elif item.operation == 'negative':
        processed_img = 255 - img
    elif item.operation == 'brightness_contrast':
        processed_img = cv2.convertScaleAbs(img, alpha=item.alpha, beta=item.beta)
    elif item.operation == 'equalize':
        gray_img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        equalized_img = cv2.equalizeHist(gray_img)
        processed_img = cv2.cvtColor(equalized_img, cv2.COLOR_GRAY2BGR)

    # --- CÁC THAO TÁC MỚI (IMAGE ENHANCING) ---

    # 1. Denoising / Smoothing
    elif item.operation == 'denoise_mean':
        # Kernel size phải là số lẻ
        k_size = item.kernel_size if item.kernel_size % 2 != 0 else item.kernel_size + 1
        processed_img = cv2.blur(img, (k_size, k_size))
    elif item.operation == 'denoise_median':
        k_size = item.kernel_size if item.kernel_size % 2 != 0 else item.kernel_size + 1
        processed_img = cv2.medianBlur(img, k_size)

    # 2. Sharpening
    elif item.operation == 'sharpen':
        # Tạo kernel làm nét
        kernel = np.array([[0, -1, 0],
                           [-1, 5, -1],
                           [0, -1, 0]])
        processed_img = cv2.filter2D(img, -1, kernel)

    # 3. Edge Detection
    else:
        # Hầu hết các bộ lọc dò biên hoạt động trên ảnh xám
        gray_img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edge_img = None
        if item.operation == 'edge_sobel':
            grad_x = cv2.Sobel(gray_img, cv2.CV_64F, 1, 0, ksize=3)
            grad_y = cv2.Sobel(gray_img, cv2.CV_64F, 0, 1, ksize=3)
            abs_grad_x = cv2.convertScaleAbs(grad_x)
            abs_grad_y = cv2.convertScaleAbs(grad_y)
            edge_img = cv2.addWeighted(abs_grad_x, 0.5, abs_grad_y, 0.5, 0)
        
        elif item.operation == 'edge_prewitt':
            kernelx = np.array([[1,1,1],[0,0,0],[-1,-1,-1]])
            kernely = np.array([[-1,0,1],[-1,0,1],[-1,0,1]])
            img_prewittx = cv2.filter2D(gray_img, -1, kernelx)
            img_prewitty = cv2.filter2D(gray_img, -1, kernely)
            edge_img = cv2.addWeighted(img_prewittx, 0.5, img_prewitty, 0.5, 0)

        elif item.operation == 'edge_canny':
            edge_img = cv2.Canny(gray_img, item.canny_threshold1, item.canny_threshold2)
        
        if edge_img is not None:
             # Chuyển ảnh kết quả (1 kênh) về 3 kênh để hiển thị trên web
            processed_img = cv2.cvtColor(edge_img, cv2.COLOR_GRAY2BGR)

    if processed_img is None:
        return {"error": "Invalid operation"}

    processed_img_base64 = image_to_base64(processed_img)
    return {'image': processed_img_base64}