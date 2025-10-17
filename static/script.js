document.addEventListener('DOMContentLoaded', () => {
    // Lấy các element từ DOM
    const imageInput = document.getElementById('image-input');
    const originalImage = document.getElementById('original-image');
    const processedImage = document.getElementById('processed-image');
    const btnReset = document.getElementById('btn-reset');
    
    // Nút mới
    const btnDenoiseMean = document.getElementById('btn-denoise-mean');
    const btnDenoiseMedian = document.getElementById('btn-denoise-median');
    const btnSharpen = document.getElementById('btn-sharpen');
    const btnEdgeSobel = document.getElementById('btn-edge-sobel');
    const btnEdgePrewitt = document.getElementById('btn-edge-prewitt');
    const btnEdgeCanny = document.getElementById('btn-edge-canny');

    const controlsPanel = document.getElementById('controls-panel');
    const imageDisplayPanel = document.getElementById('image-display-panel');

    let originalImageData = null;

    // 1. Xử lý khi người dùng chọn ảnh
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            originalImageData = event.target.result;
            originalImage.src = originalImageData;
            processedImage.src = originalImageData;

            controlsPanel.style.display = 'block';
            imageDisplayPanel.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    });

    // 2. Hàm chung để gửi yêu cầu xử lý đến backend
    async function sendRequest(operation, params = {}) {
        if (!originalImageData) {
            alert("Vui lòng chọn một ảnh trước!");
            return;
        }

        try {
            const response = await fetch('/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: originalImageData,
                    operation,
                    ...params 
                })
            });

            if (!response.ok) throw new Error(`Lỗi từ server: ${response.statusText}`);
            
            const data = await response.json();
            if (data.image) {
                processedImage.src = data.image;
            } else if (data.error) {
                alert(`Lỗi: ${data.error}`);
            }

        } catch (error) {
            console.error("Đã xảy ra lỗi khi gửi yêu cầu:", error);
            alert("Không thể xử lý ảnh. Vui lòng kiểm tra console để biết chi tiết.");
        }
    }
    
    // 3. Gán sự kiện cho các nút
    
    // Denoising
    btnDenoiseMean.addEventListener('click', () => sendRequest('denoise_mean'));
    btnDenoiseMedian.addEventListener('click', () => sendRequest('denoise_median'));

    // Sharpening
    btnSharpen.addEventListener('click', () => sendRequest('sharpen'));

    // Edge Detection
    btnEdgeSobel.addEventListener('click', () => sendRequest('edge_sobel'));
    btnEdgePrewitt.addEventListener('click', () => sendRequest('edge_prewitt'));
    btnEdgeCanny.addEventListener('click', () => sendRequest('edge_canny'));
    
    // Nút Reset
    btnReset.addEventListener('click', () => {
        if (!originalImageData) return;
        processedImage.src = originalImageData;
    });
});