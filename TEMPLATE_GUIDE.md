# Hướng dẫn tạo file Template Word (HĐ mẫu.docx)

## Cấu trúc file template

File template Word phải chứa các biến sau đây để ứng dụng có thể điền dữ liệu:

## Các biến cơ bản

### Thông tin hợp đồng
- `{so_hop_dong}`: Số hợp đồng (ví dụ: 0308.2026/HĐKT/H.V-SL368)
- `{ngay_hd}`: Ngày lập hợp đồng (số)
- `{thang_hd}`: Tháng lập hợp đồng (số)
- `{nam_hd}`: Năm lập hợp đồng (số)

### Thông tin công ty
- `{ten_cong_ty}`: Tên công ty khách hàng
- `{mst}`: Mã số thuế
- `{nguoi_dai_dien}`: Tên người đại diện pháp luật
- `{chuc_vu}`: Chức vụ (mặc định: Giám đốc)
- `{dia_chi_cong_ty}`: Địa chỉ công ty

### Danh sách hàng hóa (Sử dụng loop)
```
{#hang_hoa}
{ten_sp} - {dvt} - {so_luong} - {don_gia}
{/hang_hoa}
```

### Thông tin bàn giao
- `{ngay_giao}`: Ngày bàn giao (số)
- `{thang_giao}`: Tháng bàn giao (số)
- `{nam_giao}`: Năm bàn giao (số)

## Ví dụ mẫu template

```
HỢP ĐỒNG MUA BÁN

Số hợp đồng: {so_hop_dong}
Hôm nay, ngày {ngay_hd} tháng {thang_hd} năm {nam_hd}

Bên A: CÔNG TY ABC
Bên B: {ten_cong_ty}
Mã số thuế: {mst}
Đại diện bởi: {nguoi_dai_dien}
Chức vụ: {chuc_vu}

CHI TIẾT HÀNG HÓA:
{#hang_hoa}
- {ten_sp} | {dvt} | {so_luong} | {don_gia}
{/hang_hoa}

Biên bản bàn giao ngày {ngay_giao}/{thang_giao}/{nam_giao}
```

## Lưu ý quan trọng

1. **Giữ nguyên định dạng:** Docxtemplater sẽ giữ nguyên style của template
2. **Loop syntax:** Đối với danh sách hàng hóa, phải sử dụng cú pháp `{#hang_hoa}...{/hang_hoa}`
3. **Tên biến:** Phải chính xác theo tên được định nghĩa trong ứng dụng
4. **Vị trí:** Đặt file template cùng thư mục với file .exe ứng dụng

## Kiểm tra template

Sau khi tạo template:
1. Đặt file tên là `HĐ mẫu.docx`
2. Đặt cùng thư mục với file .exe
3. Chạy ứng dụng và test với một file PDF mẫu
4. Kiểm tra file kết quả trong thư mục `Output`

Nếu kết quả không đúng:
- Kiểm tra tên biến có chính xác không
- Kiểm tra cú pháp loop có đúng không
- Đảm bảo không có lỗi chính tả trong tên biến
