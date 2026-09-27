# Hướng dẫn tạo Icon cho ứng dụng

## Cách tạo file icon.ico

### Cách 1: Sử dụng công cụ online
1. Truy cập: https://www.icoconverter.com/ hoặc https://icoconvert.com/
2. Upload ảnh PNG/JPG của bạn (kích thước khuyến nghị: 256x256 pixels)
3. Chọn định dạng ICO
4. Download file icon.ico
5. Đặt file vào thư mục `assets/icon.ico`

### Cách 2: Sử dụng ImageMagick (nếu đã cài đặt)
```bash
convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 assets/icon.ico
```

### Cách 3: Bỏ qua icon (để build nhanh)
Nếu không cần icon, bạn có thể:
1. Xóa dòng `icon: assets/icon.ico` trong file `electron-builder.yml`
2. Hoặc tạo một file icon.ico đơn giản

## Kích thước khuyến nghị
- 256x256 pixels (để hiển thị tốt nhất trên Windows)
- Format: PNG trước khi convert sang ICO
- Nền trong suốt (transparent) trông chuyên nghiệp hơn

## Nếu không có icon
Ứng dụng vẫn có thể build và chạy bình thường, chỉ là sẽ sử dụng icon mặc định của Electron.
