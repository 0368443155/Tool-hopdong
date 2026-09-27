const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

dayjs.extend(customParseFormat);

// Xử lý viết tắt Tên công ty an toàn với Tiếng Việt
function getCompanyAbbreviation(companyName) {
    let cleanName = companyName.toUpperCase();
    const ignorePhrases = ['CÔNG TY', 'TNHH', 'DỊCH VỤ', 'CỔ PHẦN', 'MTV', 'VÀ', 'THƯƠNG MẠI', 'SẢN XUẤT', 'PHÁT TRIỂN'];
    
    ignorePhrases.forEach(phrase => {
        cleanName = cleanName.replace(new RegExp(phrase, 'g'), ' ');
    });
    
    const words = cleanName.trim().split(/\s+/).filter(w => w.length > 0);
    // Bỏ dấu chấm giữa các chữ cái, nối liền nhau (VD: MA thay vì M.A)
    return words.map(w => w[0]).join('');
}

// Cào dữ liệu đại diện bằng Puppeteer
async function scrapeRepresentative(mst) {
    // Dynamic import để tránh lỗi ERR_REQUIRE_ESM
    const puppeteerModule = await import('puppeteer');
    const puppeteer = puppeteerModule.default || puppeteerModule;
    
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: true, 
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        
        // Chặn tải tài nguyên không cần thiết để tăng tốc
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto('https://masothue.com/', { waitUntil: 'domcontentloaded' });
        await page.type('#search', mst, { delay: 10 });
        
        await Promise.all([
            page.keyboard.press('Enter'),
            page.waitForNavigation({ waitUntil: 'domcontentloaded' })
        ]);
        
        // Bắt buộc đợi đúng 2000ms theo yêu cầu
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const data = await page.evaluate(() => {
            const el = document.querySelector('tr[itemprop="alumni"] span[itemprop="name"] a');
            return el ? el.innerText.trim() : 'không tìm được';
        });
        return data;
    } catch (e) {
        return 'không tìm được';
    } finally {
        if (browser) await browser.close();
    }
}

// Bóc tách mảng hàng hóa và các thông tin tổng tiền từ PDF
function parseInvoiceData(text) {
    const products = [];
    let tong_truoc_thue = '';
    let tien_thue = '';
    let tong_sau_thue = '';
    let tien_bang_chu = '';

    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    let currentProduct = null;
    let sttCounter = 1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 1. Trích xuất các trường tổng cộng
        if (/(?:Cộng tiền hàng|Tổng tiền hàng)[^\d]*([\d\.,]+)/i.test(line)) {
            tong_truoc_thue = line.match(/(?:Cộng tiền hàng|Tổng tiền hàng)[^\d]*([\d\.,]+)/i)[1];
            continue;
        }
        if (/Tiền thuế GTGT[^\d]*([\d\.,]+)/i.test(line)) {
            tien_thue = line.match(/Tiền thuế GTGT[^\d]*([\d\.,]+)/i)[1];
            continue;
        }
        if (/Tổng tiền thanh toán[^\d]*([\d\.,]+)/i.test(line)) {
            tong_sau_thue = line.match(/Tổng tiền thanh toán[^\d]*([\d\.,]+)/i)[1];
            continue;
        }
        if (/(?:Số tiền viết bằng chữ|Bằng chữ)[\s:]+(.+)/i.test(line)) {
            tien_bang_chu = line.match(/(?:Số tiền viết bằng chữ|Bằng chữ)[\s:]+(.+)/i)[1].trim();
            continue;
        }

        // 2. Logic tìm dòng STT đứng riêng lẻ (thường bị ngắt dòng do MISA xuất PDF)
        if (line === sttCounter.toString()) {
            if (currentProduct) products.push(currentProduct);
            currentProduct = { stt: line, ten_sp: '', dvt: '', so_luong: '', don_gia: '', thanh_tien: '' };
            sttCounter++;
            continue;
        }

        // 3. Xử lý gom dòng Tên sản phẩm và bóc tách dòng Đơn giá cuối cùng
        if (currentProduct) {
            // First, try to match if there are spaces separating them
            const endMatch = line.match(/^(Chiếc|Cái|Bộ|Hộp|Kg|Cuộn|Gói|Chai|M|M2|L|G|Bản|Tấm|Thùng|Mét|Viên)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)$/i);
            
            let matched = false;

            if (endMatch) {
                currentProduct.dvt = endMatch[1];
                currentProduct.so_luong = endMatch[2];
                currentProduct.don_gia = endMatch[3];
                currentProduct.thanh_tien = endMatch[4];
                products.push(currentProduct);
                currentProduct = null;
                matched = true;
            } else {
                const dvtRegex = /^(Chiếc|Cái|Bộ|Hộp|Kg|Cuộn|Gói|Chai|M|M2|L|G|Bản|Tấm|Thùng|Mét|Viên)([\d\.,]+)$/i;
                const dvtMatch = line.match(dvtRegex);
                if (dvtMatch) {
                    const dvt = dvtMatch[1];
                    let nums = dvtMatch[2];
                    
                    const stickyRegex = /^(\d+(?:,\d{1,3})?)(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)$/;
                    const parts = nums.match(stickyRegex);
                    
                    if (parts) {
                         currentProduct.dvt = dvt;
                         currentProduct.so_luong = parts[1];
                         currentProduct.don_gia = parts[2];
                         currentProduct.thanh_tien = parts[3];
                         products.push(currentProduct);
                         currentProduct = null;
                         matched = true;
                    }
                }
            }

            if (!matched) {
                if (currentProduct.ten_sp !== '') currentProduct.ten_sp += ' ';
                currentProduct.ten_sp += line;
            }
        } else {
            // Fallback nếu form cũ 1 dòng: 1 Tấm Module P1.8... Cái 226,000 460.000,00 103.960.000
            const inlineMatch = line.match(/^(\d+)\s+(.+?)\s+([A-Za-zÀ-ỹ\s]+?)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)$/i);
            if (inlineMatch && parseInt(inlineMatch[1]) > 0 && parseInt(inlineMatch[1]) < 1000) {
                products.push({
                    stt: inlineMatch[1],
                    ten_sp: inlineMatch[2].trim(),
                    dvt: inlineMatch[3].trim(),
                    so_luong: inlineMatch[4].trim(),
                    don_gia: inlineMatch[5].trim(),
                    thanh_tien: inlineMatch[6].trim()
                });
                sttCounter = parseInt(inlineMatch[1]) + 1;
            }
        }
    }
    if (currentProduct && currentProduct.ten_sp) products.push(currentProduct);

    return { products, tong_truoc_thue, tien_thue, tong_sau_thue, tien_bang_chu };
}

// Lắng nghe IPC
ipcMain.handle('process-pdfs', async (event, { filePaths, outDir }) => {
    // Xác định đường dẫn gốc dù đang chạy dev hay đã build exe
    const isDev = !app.isPackaged;
    const appRoot = isDev ? process.cwd() : path.dirname(process.execPath);
    const templatePath = isDev 
        ? path.join(appRoot, 'HĐ mẫu.docx') 
        : path.join(process.resourcesPath, 'HĐ mẫu.docx');
    
    // Nếu người dùng chọn thư mục thì dùng nó, nếu không dùng mặc định 'Output'
    const outputDir = outDir || path.join(appRoot, 'Output');

    if (!fs.existsSync(templatePath)) {
        return { error: `Không tìm thấy file mẫu tại: ${templatePath}` };
    }

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const results = [];
    for (const filePath of filePaths) {
        const fileName = path.basename(filePath);
        
        if (path.extname(fileName).toLowerCase() !== '.pdf') {
            event.sender.send('log', { file: fileName, status: 'Bỏ qua (không phải PDF)' });
            continue;
        }

        try {
            event.sender.send('log', { file: fileName, status: 'Đang trích xuất PDF...' });
            
            console.log(`\n--- BẮT ĐẦU XỬ LÝ FILE: ${fileName} ---`);
            const pdfBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(pdfBuffer);
            const text = data.text;
            
            console.log("=== NỘI DUNG TEXT ĐỌC ĐƯỢC TỪ PDF ===");
            console.log(text);
            console.log("=====================================");

            let ten_cong_ty = '';
            let mst = '';
            let ngay_hd_str = '';
            let dia_chi_cong_ty = '';

            const companySplit = text.split(/Tên đơn vị:\s*/i);
            if (companySplit.length > 1) {
                const buyerSection = companySplit[1];
                const companyMatch = buyerSection.match(/^([^\n]+)/);
                if (companyMatch) ten_cong_ty = companyMatch[1].trim();

                const mstMatch = buyerSection.match(/Mã số thuế:\s*(\d{10,13})/i);
                if (mstMatch) mst = mstMatch[1];
                
                const addrMatch = buyerSection.match(/Địa chỉ:\s*([^\n]+)/i);
                if (addrMatch) dia_chi_cong_ty = addrMatch[1].trim();
            } else {
                const companyMatch = text.match(/Tên đơn vị:\s*([^\n]+)/i);
                if (companyMatch) ten_cong_ty = companyMatch[1].trim();

                const mstMatch = text.match(/Mã số thuế:\s*(\d{10,13})/i);
                if (mstMatch) mst = mstMatch[1];
                
                const addrMatch = text.match(/Địa chỉ:\s*([^\n]+)/i);
                if (addrMatch) dia_chi_cong_ty = addrMatch[1].trim();
            }
            if (!dia_chi_cong_ty) dia_chi_cong_ty = ten_cong_ty;

            const dateMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (dateMatch) ngay_hd_str = dateMatch[0];

            if (!ten_cong_ty || !ngay_hd_str) {
                event.sender.send('log', { file: fileName, status: 'Lỗi: Thiếu Tên hoặc Ngày' });
                continue;
            }

            const invoiceDate = dayjs(ngay_hd_str, 'DD/MM/YYYY');
            const contractDate = invoiceDate.subtract(3, 'day');
            
            const ngay_hd = contractDate.format('DD');
            const thang_hd = contractDate.format('MM');
            const nam_hd = contractDate.format('YYYY');
            const ngay_giao = invoiceDate.format('DD');
            const thang_giao = invoiceDate.format('MM');
            const nam_giao = invoiceDate.format('YYYY');

            const abbr = getCompanyAbbreviation(ten_cong_ty);
            const so_hop_dong = `${ngay_hd}${thang_hd}.${nam_hd}/HĐKT/${abbr}-SL368`;

            // Lấy số hợp đồng / số hóa đơn từ PDF để đặt tên file
            let so_hd_tu_pdf = '';
            // Xóa "Mẫu số..." khỏi text để không bị bắt nhầm
            const textSafe = text.replace(/Mẫu\s*số[^\n]*/gi, '');
            
            // Regex thông minh: 
            // 1. Tìm chữ "Số:" hoặc "Số hóa đơn:"
            // 2. Bỏ qua các chuỗi rác chứa số xen lẫn chữ (ví dụ 26TYY bị rớt dòng từ Ký hiệu)
            // 3. Bắt buộc số hóa đơn phải bắt đầu bằng 0 (vd 00000476) hoặc có độ dài 7-8 chữ số.
            const m = textSafe.match(/(?:Số hợp đồng|Số HĐ|Số hóa đơn|Số(?:\s*\(No\.\))?|Số\s*\/\s*No\.?|Số)[\s:]*(?:[a-zA-Z0-9]*\d[a-zA-Z0-9]*[\s:]*)?\b((?:0+\d+|\d{7,8}))\b/i);
            
            if (m) {
                // Xóa các số 0 ở đầu để file chỉ còn HĐ476 thay vì HĐ00000476
                so_hd_tu_pdf = m[1].replace(/^0+/, '');
            } else {
                so_hd_tu_pdf = "XXX"; // Fallback nếu không tìm thấy
            }

            // Trích xuất mảng hàng hóa và tổng cộng
            const invoiceData = parseInvoiceData(text);
            let hang_hoa = invoiceData.products;
            
            console.log("=== KẾT QUẢ BÓC TÁCH HÀNG HÓA TỪ HÓA ĐƠN ===");
            console.log(JSON.stringify(invoiceData, null, 2));
            console.log("============================================");

            if (hang_hoa.length === 0) {
                console.log("CẢNH BÁO: Không tìm thấy hàng hóa nào, sử dụng dữ liệu mặc định!");
                hang_hoa.push({ stt: "1", ten_sp: "Theo hóa đơn", dvt: "Gói", so_luong: "1", don_gia: "Chi tiết", thanh_tien: "0" });
            }
            
            // Địa chỉ công ty đã được lấy ở trên

            // Chạy Puppeteer giả lập chuẩn xác
            event.sender.send('log', { file: fileName, status: 'Đang tra cứu MST trên masothue...' });
            
            let nguoi_dai_dien = 'không tìm được';
            if (mst) {
                const puppeteerModule = await import('puppeteer');
                const puppeteer = puppeteerModule.default || puppeteerModule;
                let browser;
                try {
                    browser = await puppeteer.launch({ 
                        headless: false, 
                        executablePath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
                        args: ['--no-sandbox'] 
                    });
                    const page = await browser.newPage();
                    
                    // Đi thẳng vào trang chủ
                    await page.goto('https://masothue.com/', { waitUntil: 'domcontentloaded' });
                    
                    // Chờ ô tìm kiếm xuất hiện
                    await page.waitForSelector('#search', { timeout: 10000 });
                    await page.focus('#search');
                    await page.$eval('#search', el => el.value = ''); // Xóa sạch input
                    
                    // Gõ MST
                    await page.type('#search', mst, { delay: 30 });
                    
                    // Bấm Enter và KHÔNG DÙNG waitForNavigation (vì form submit qua Ajax hoặc redirect)
                    await page.keyboard.press('Enter');
                    
                    // Timeout cứng đúng 3000ms theo yêu cầu (để trang tải xong dữ liệu)
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    nguoi_dai_dien = await page.evaluate(() => {
                        const el = document.querySelector('tr[itemprop="alumni"] span[itemprop="name"] a');
                        return el ? el.innerText.trim() : 'không tìm được';
                    });
                } catch(e) {
                    nguoi_dai_dien = 'không tìm được';
                } finally {
                    if (browser) await browser.close();
                }
            }
            
            if (nguoi_dai_dien === 'không tìm được' || !nguoi_dai_dien) {
                event.sender.send('log', { file: fileName, status: 'Lỗi ❌: Không tìm thấy đại diện' });
                continue; // Bỏ qua không xuất file
            }

            const chuc_vu = 'Giám đốc';

            // Ghi file Word
            event.sender.send('log', { file: fileName, status: 'Đang kết xuất Word...' });
            const content = fs.readFileSync(templatePath, 'binary');
            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

            doc.render({
                so_hop_dong, ngay_hd, thang_hd, nam_hd,
                ten_cong_ty, mst, nguoi_dai_dien, chuc_vu, dia_chi_cong_ty,
                hang_hoa,
                tong_truoc_thue: invoiceData.tong_truoc_thue,
                tien_thue: invoiceData.tien_thue,
                tong_sau_thue: invoiceData.tong_sau_thue,
                tien_bang_chu: invoiceData.tien_bang_chu,
                ngay_giao, thang_giao, nam_giao
            });

            const buf = doc.getZip().generate({ type: 'nodebuffer' });
            
            // Lấy viết tắt của người đại diện (ví dụ: Nguyễn Văn A -> NVA)
            const nguoi_dai_dien_abbr = nguoi_dai_dien.trim().split(/\s+/).map(w => w ? w[0].toUpperCase() : '').join('');
            
            // Tên file xuất ra: HĐ + số hợp đồng_(tên viết tắt của người đại diện)
            const finalFileName = `HĐ${so_hd_tu_pdf}_${nguoi_dai_dien_abbr}.docx`;
            const outPath = path.join(outputDir, finalFileName);
            fs.writeFileSync(outPath, buf);

            event.sender.send('log', { file: fileName, outFile: finalFileName, status: 'Thành công' });

        } catch (error) {
            event.sender.send('log', { file: fileName, status: `Lỗi: ${error.message}` });
        }
    }
    return { success: true };
});

// Khởi tạo giao diện
app.whenReady().then(() => {
    const mainWindow = new BrowserWindow({
        width: 1050,
        height: 750,
        webPreferences: {
            nodeIntegration: false,    // Bảo mật: Tắt node ở renderer
            contextIsolation: true,    // Bật Context Isolation
            preload: path.join(__dirname, 'preload.js')
        }
    });
    
    // Ẩn menu mặc định cho đẹp
    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
});

ipcMain.handle('select-files', async (event) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Hóa đơn PDF', extensions: ['pdf'] }]
    });
    return canceled ? [] : filePaths;
});

// Thêm IPC cho việc chọn thư mục xuất
ipcMain.handle('select-dir', async (event) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return canceled ? null : filePaths[0];
});
