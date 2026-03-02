import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const match = arr[0].match(/:(.*?);/);
    const mime = match ? match[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

export const compressImage = (src: string, maxDim = 1024, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
        // If not base64 and not http(s) url, return as is
        if (!src) {
            resolve("");
            return;
        }

        const img = new Image();
        // IMPORTANT: Allow cross-origin for Vercel Blob / external images
        img.crossOrigin = "anonymous"; 
        
        // Timeout to prevent hanging
        const timeoutId = setTimeout(() => {
            console.warn("Image load timeout, using original src");
            resolve(src);
        }, 5000);

        img.onload = () => {
            clearTimeout(timeoutId);
            try {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;
                
                // Always resize if larger than maxDim
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    resolve(src);
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                
                // Re-encode with lower quality
                const dataUrl = canvas.toDataURL("image/jpeg", quality);
                resolve(dataUrl);
            } catch (e) {
                console.warn("Canvas compression failed (likely CORS), using original src", e);
                // Fallback to original URL if canvas fails (e.g. strict CORS)
                resolve(src);
            }
        };
        
        img.onerror = () => {
            clearTimeout(timeoutId);
            console.warn("Image load failed, using original src");
            resolve(src);
        };
        
        img.src = src;
    });
};
