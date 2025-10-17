document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const imageInput = document.getElementById('image-input');
    const imageThumbnail = document.getElementById('image-thumbnail');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const controlsPanel = document.getElementById('controls-panel');
    
    const welcomeMessage = document.getElementById('welcome-message');
    const imageWorkspace = document.getElementById('image-workspace');
    
    const originalImage = document.getElementById('original-image');
    const processedImage = document.getElementById('processed-image');
    const activeFilterName = document.getElementById('active-filter-name');
    const loader = document.getElementById('loader');
    const btnReset = document.getElementById('btn-reset');
    const filterButtons = document.querySelectorAll('.btn[data-operation]');

    // Sliders & Values
    const sliders = {
        'denoise-kernel': document.getElementById('denoise-kernel-value'),
        'canny-thresh1': document.getElementById('canny-thresh1-value'),
        'canny-thresh2': document.getElementById('canny-thresh2-value')
    };

    let originalImageData = null;

    // --- INITIALIZATION ---
    function init() {
        // 1. Upload Image
        imageInput.addEventListener('change', handleImageUpload);

        // 2. Filter Buttons Click
        filterButtons.forEach(btn => {
            btn.addEventListener('click', handleFilterClick);
        });

        // 3. Reset Button
        btnReset.addEventListener('click', resetToOriginal);
        
        // 4. Update Slider Values visible text
        for (const [id, valueSpan] of Object.entries(sliders)) {
            const slider = document.getElementById(id);
            slider.addEventListener('input', () => valueSpan.textContent = slider.value);
        }
    }

    // --- EVENT HANDLERS ---
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            originalImageData = event.target.result;
            
            // Update UI state
            imageThumbnail.src = originalImageData;
            imageThumbnail.style.display = 'block';
            uploadPlaceholder.style.display = 'none';
            
            // Enable controls
            controlsPanel.style.opacity = '1';
            controlsPanel.style.pointerEvents = 'auto';

            // Show workspace, hide welcome
            welcomeMessage.classList.add('hidden');
            imageWorkspace.classList.remove('hidden');

            // Set images
            originalImage.src = originalImageData;
            resetToOriginal();
        };
        reader.readAsDataURL(file);
    }

    async function handleFilterClick(e) {
        // Highlight active button
        filterButtons.forEach(btn => btn.classList.remove('active-filter'));
        e.target.classList.add('active-filter');

        const operation = e.target.dataset.operation;
        const filterName = e.target.textContent;
        
        // Collect parameters based on operation type
        let params = {};
        if (operation.startsWith('denoise')) {
            params.kernel_size = parseInt(document.getElementById('denoise-kernel').value);
        } else if (operation === 'edge_canny') {
            params.canny_threshold1 = parseInt(document.getElementById('canny-thresh1').value);
            params.canny_threshold2 = parseInt(document.getElementById('canny-thresh2').value);
        }

        // Update title and send request
        activeFilterName.textContent = filterName;
        loader.classList.remove('hidden'); // Show loader on processed image

        try {
            const data = await sendRequest(operation, params);
            if (data.image) {
                processedImage.src = data.image;
            }
        } catch (error) {
            console.error(error);
            alert("Có lỗi xảy ra khi xử lý ảnh.");
        } finally {
            loader.classList.add('hidden'); // Hide loader
        }
    }

    function resetToOriginal() {
        filterButtons.forEach(btn => btn.classList.remove('active-filter'));
        processedImage.src = originalImageData;
        activeFilterName.textContent = "Ảnh gốc";
    }

    // --- API COMMUNICATION ---
    async function sendRequest(operation, params = {}) {
        const response = await fetch('/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: originalImageData, operation, ...params })
        });
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    }

    // Start App
    init();
});