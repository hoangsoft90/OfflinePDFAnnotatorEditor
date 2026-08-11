# Offline PDF Workspace for Android — Final Design & Engineering Blueprint (v2.0)

> Tổng hợp từ `plan1.md` → `plan1_final.md` và 11 bản review của các AI (`plan1_review1-5`, `plan1_final_review1-6`).
> Đây là bản cuối cùng, gộp toàn bộ product strategy đã đồng thuận + engineering contracts còn thiếu, sẵn sàng giao cho developer/AI coding agent.

---

## 0. Executive Summary

**Ý tưởng:** 9.5/10 — pain point thật (privacy khi thao tác PDF nhạy cảm), USP mạnh, chưa app nào trên Android cam kết offline 100% + full-featured.

**Ba trụ cột sản phẩm (không thay đổi qua mọi vòng review):**

```
OFFLINE  ·  PRIVACY  ·  PRODUCTIVITY
```

**Tên sản phẩm:** Offline PDF Workspace (bỏ tên "Annotator & Editor" vì gây hiểu nhầm là true text editor).

**Thông điệp cốt lõi:** *"Your PDFs never leave your device."*

**Trạng thái tài liệu:** Đây là bản duy nhất coi là đủ điều kiện để bắt đầu POC kỹ thuật — không cần thêm vòng review sản phẩm nào nữa. Phần còn thiếu duy nhất trước khi code UI là **khóa các ADR ở Mục 5**.

---

## 1. Pain Point & Target User

| Pain point | Mức độ | Đối tượng |
|---|---|---|
| Sợ upload tài liệu nhạy cảm (hợp đồng, CMND, hồ sơ y tế, sao kê) lên cloud | Rất cao | Mọi người dùng có tài liệu nhạy cảm |
| Phải dùng nhiều app rời rạc (viewer, annotate, sign, merge...) | Cao | Sinh viên, nhân viên văn phòng |
| Subscription fatigue của Adobe/Foxit/Xodo | Rất cao | Mọi người dùng |

**Target P0:** sinh viên, nhân viên văn phòng, luật sư/kế toán (privacy-sensitive).
**Target P1:** bác sĩ (tài liệu y tế).
**Anti-target:** người cần OCR, PDF→Word, true text reflow, cloud sync — không phục vụ nhóm này ở MVP.

---

## 2. MVP Scope — Feature Prioritization (đã khóa qua nhiều vòng review)

### 🔴 P0 — MVP bắt buộc

| Nhóm | Tính năng |
|---|---|
| **Viewer** | Open PDF (SAF), render, zoom/pan, page navigation, thumbnails, text search, recent files |
| **Annotation** | Highlight, underline, strikeout, freehand pen, eraser, text box (add-only), shapes, undo/redo |
| **Signature** | Vẽ chữ ký (gọi là *"Signature annotation"*, không gọi "Digital Signature"), lưu local, đặt/di chuyển/resize |
| **Page Ops** | Rotate, delete, reorder (drag-drop), extract |
| **Document** | Save As / Export copy (mặc định), Overwrite (atomic, có xác nhận), rename, duplicate, share |
| **Privacy** | 100% local, không account, không network, không analytics gửi ngoài |
| **Reliability** | Non-destructive editing, crash-safe autosave, existing-annotation preservation |

### 🟡 P1 — Sau MVP

Merge/Split PDF, AcroForm fill, metadata edit, password/encryption, stamps/sticky notes, night mode, continuous scroll, bookmarks/outline, App Lock (biometric/PIN), signature asset encryption, conflict detection UI đầy đủ.

### 🟢 P2 — Dài hạn / có thể không làm

OCR on-device, PDF→Word/Excel, true text editing, advanced compression, digital certificate (PKI) signature, redaction, image object editing.

**Nguyên tắc bất di bất dịch:** Không hứa "Edit text" trong marketing — chỉ "Add text box". Không đưa AI cloud vào bất kỳ giai đoạn nào (mâu thuẫn trực tiếp với USP privacy).

---

## 3. Kiến trúc tổng thể

```
┌──────────────────────────────────────────────────────────┐
│                      FLUTTER UI LAYER                     │
│   Home / Viewer / Annotation Toolbar / Page Organizer /   │
│   Settings — chỉ nhận gesture & hiển thị bitmap đã render │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│              DOMAIN LAYER (BLoC / Riverpod)               │
│  DocumentManager · AnnotationManager · ProjectManager ·   │
│  CommandStack (Undo/Redo) · ConflictDetector              │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│              PDF ENGINE ABSTRACTION (interface)            │
└─────────────┬─────────────────────────────┬───────────────┘
              │                             │
      ┌───────▼────────┐          ┌─────────▼─────────┐
      │    Renderer     │          │      Modifier      │
      └───────┬────────┘          └─────────┬─────────┘
              └─────────────┬───────────────┘
                            │
              ┌─────────────▼─────────────┐
              │   PDF ISOLATE (background)  │
              │  renderPage / searchText /  │
              │  export / generateThumbnail │
              └─────────────┬─────────────┘
                            │
              ┌─────────────▼─────────────┐
              │  NATIVE ENGINE: PDFium (BSD) │
              │  qua package có sẵn (pdfrx / │
              │  pdfx) — KHÔNG tự viết FFI   │
              │  từ đầu nếu deadline gấp     │
              └───────────────────────────┘
```

### 3.1. Quyết định PDF Engine

- **Sai lầm cần tránh:** package `pdf` trên pub.dev là generator, KHÔNG phải renderer/editor — không dùng làm engine chính.
- **Khuyến nghị:** PDFium (BSD 3-clause, dùng trong Chrome/Google Drive) — an toàn license cho open-source.
- **Tránh:** Poppler (GPL), MuPDF (AGPL) nếu muốn giữ khả năng phân phối linh hoạt.
- **Thực dụng khi cần tốc độ:** dùng package Flutter đã wrap sẵn PDFium (`pdfrx`, `pdfx`) thay vì tự viết Dart FFI bindings từ đầu — tiết kiệm nhiều ngày công, vẫn giữ được lớp `PdfEngine` abstraction để thay thế sau nếu cần.

### 3.2. Isolate / Background Threading (hard requirement)

- Mọi thao tác nặng (`renderPage`, `searchText`, `export`, `generateThumbnail`) **bắt buộc** chạy trên Isolate riêng.
- UI thread chỉ nhận `Uint8List` bitmap đã render xong qua `SendPort`/`ReceivePort`.
- Không tuân thủ → ANR khi mở file scan 100-200MB trên máy tầm trung.
- **Export dài (>vài giây):** dùng foreground service tạm thời + progress notification, để tránh OEM aggressive battery killers (MIUI, EMUI, One UI) kill isolate giữa chừng khi export file lớn.

---

## 4. Data Model (đã sửa lỗi Page Identity)

```dart
// Document metadata (SQLite) — CHỈ metadata, không lưu PDF dạng BLOB
class Document {
  final String id;
  final String uri;            // content:// URI từ SAF
  final String name;
  final int size;
  final int pageCount;
  final DateTime lastOpened;
  final DateTime modifiedAt;
  final bool isFavorite;
}

// Project (JSON, non-destructive layer)
class Project {
  final String id;
  final String documentId;
  final int revision;
  final bool dirty;
  final DateTime createdAt;
  final DateTime modifiedAt;
  final String autosavePath;
  final String sourceFingerprint;   // lastModified + size (+ hash 1KB đầu)
  final String? exportPath;
  final List<String> pageOrder;     // List<pageId>, KHÔNG phải index
}

// ⚠️ QUAN TRỌNG: Annotation tham chiếu pageId (ổn định), KHÔNG tham chiếu pageIndex
// pageIndex chỉ được suy ra tại thời điểm render: pageOrder.indexOf(pageId)
class Annotation {
  final String id;
  final String pageId;              // KHÔNG dùng pageIndex trực tiếp — xem ADR-007
  final AnnotationType type;        // highlight, pen, text, shape, signature...
  final AnnotationGeometry geometry;
  final Color color;
  final double opacity;
  final String? content;            // text notes
  final String? assetPath;          // signature image, stamp...
  final DateTime createdAt;
  final DateTime modifiedAt;
}

class AnnotationGeometry {
  final Rect? boundingBox;          // PDF native coordinates (points, bottom-left origin)
  final List<Offset>? pathPoints;   // freehand pen / polyline
  final int pageRotation;           // 0, 90, 180, 270 — snapshot tại thời điểm tạo
}

class Signature {
  final String id;
  final String imagePath;           // internal storage, xem cân nhắc mã hoá ở ADR-006
  final DateTime createdAt;
}
```

---

## 5. Engineering Contracts (ADRs) — bắt buộc khóa trước khi code UI

Đây là phần biến plan từ "product vision" thành "blueprint thực thi được" — tổng hợp từ toàn bộ 11 review, không lược bớt điểm nào đã đạt đồng thuận cao.

### ADR-001 — PDF Engine
PDFium qua package Flutter có sẵn (pdfrx/pdfx) cho giai đoạn đầu; giữ `PdfEngine` interface để thay engine sau nếu cần. Audit license mọi native dependency trước khi tích hợp (ưu tiên BSD/MIT/Apache 2.0).

### ADR-002 — Storage Model & Android SAF
- Dùng `DocumentFile` + `ContentResolver`, mở file qua `ACTION_OPEN_DOCUMENT`, giữ quyền bằng `takePersistableUriPermission()`.
- Không giả định path kiểu `/storage/emulated/0/...` — bắt buộc từ Android 11+ (API 30+).
- PDF gốc giữ nguyên tại vị trí người dùng chọn; Project (JSON) + assets lưu trong app cache riêng theo `docId`.
- Metadata (recent, favorites) trong SQLite — **không bao giờ** lưu PDF dạng BLOB.

### ADR-007 — Page Identity Model *(mới, phát hiện ở vòng review cuối)*
- **Vấn đề:** Nếu `Annotation` tham chiếu `pageIndex` (số thứ tự), thao tác Delete/Reorder trang sẽ khiến annotation "nhảy" sang trang khác một cách âm thầm — silent data corruption, không crash, không lỗi rõ ràng.
- **Giải pháp:** Annotation tham chiếu `pageId` ổn định (UUID sinh khi mở project lần đầu, hoặc hash nội dung trang gốc), độc lập với vị trí hiển thị. `pageIndex` chỉ tính runtime từ `pageOrder.indexOf(pageId)`.
- **Test bắt buộc trong Golden Suite:** "Highlight trang 5 → xoá trang 2 → export → highlight vẫn đúng nội dung trang ban đầu."

### ADR-008 — Intent & External-Open Handling *(mới)*
- Hai luồng mở file hoàn toàn khác nhau về quyền hạn:

| Luồng | Intent | Quyền truy cập |
|---|---|---|
| User tự chọn trong app | `ACTION_OPEN_DOCUMENT` | Persist được qua `takePersistableUriPermission()` |
| App khác share/mở vào (Gmail, WhatsApp, Drive...) | `ACTION_VIEW` / `ACTION_SEND` | Thường chỉ tạm thời, **mất khi Activity kết thúc** nếu không xử lý |

- Khai báo `intent-filter` cho `ACTION_VIEW`/`ACTION_SEND` với MIME `application/pdf`.
- Khi nhận qua luồng tạm thời: chủ động copy vào app-private storage hoặc xin persist permission ngay, nếu không thể thì gắn nhãn rõ "phiên tạm thời", không hứa lưu Recent Files.
- **Test bắt buộc:** mở PDF từ Gmail → thoát hẳn app → mở lại từ Recent Files → phải hoạt động đúng hoặc báo lỗi rõ ràng, không crash im lặng.

### ADR-003 — Coordinate System
- PDF Spec (ISO 32000) dùng gốc tọa độ **bottom-left**, đơn vị **points** (1/72 inch). Flutter Canvas dùng **top-left**, pixel.
- Annotation phải lưu bằng **PDF native coordinates**, không lưu screen coordinates.
- Cần Matrix Transformation Layer: `Screen (pixels, zoom, pan) ↔ Viewport (canvas bounds) ↔ PDF Points (CropBox/MediaBox)`.
- Không tuân thủ → lệch vị trí highlight/pen khi zoom, xoay, hoặc mở trên thiết bị khác mật độ điểm ảnh.

### ADR-004 — Save / Export / Overwrite Semantics
```
[ Original PDF ] (read-only reference)
        │
        ├──► [ Project Workspace / JSON Draft ] (autosave local)
        │           ├── Annotations layer
        │           ├── Page Operations map (pageOrder theo pageId)
        │           └── Signatures asset
        │
        └──► [ Export Action ]
                    ├── Save Copy As... (MẶC ĐỊNH khuyên dùng)
                    └── Overwrite Original (atomic write + xác nhận rõ ràng)
```
- Atomic commit: `Draft → render vào file .tmp → verify integrity → fsync → rename` (không bao giờ ghi trực tiếp đè file gốc).
- **Existing annotations/form fields:** Engine phải đọc & hiển thị annotation có sẵn từ Adobe/Foxit/Xodo, và **preserve** khi export trừ khi user chủ động chọn "Flatten". Rotate/Reorder/Delete page không được làm mất annotation/form hiện có — làm mất là data corruption im lặng.
- **Rasterize principle:** Không rasterize PDF (text→ảnh) trừ khi bắt buộc — giữ vector, font, links, forms nếu engine hỗ trợ.

### ADR-005 — Undo/Redo & Crash Recovery
- Command Pattern độc lập với PDF Engine:
```
Command (AddAnnotation | DeleteAnnotation | MoveAnnotation |
         RotatePage | DeletePage | ReorderPages | AddSignature)
  .execute() / .undo()
CommandStack { undoStack, redoStack }
```
- Mỗi `.execute()` append ngay vào `journal.json`. Khi Process Death, mở lại app đọc journal để phục hồi phiên làm việc dở dang → hiển thị dialog "Recover unsaved changes?".
- UX bắt buộc: khi user rời viewer có thay đổi chưa lưu → luôn hỏi `[Continue editing] [Save] [Discard]`.

### ADR-006 — Privacy & Network Contract
```
NETWORK CONTRACT
- App phải chạy đầy đủ khi network bị tắt hoàn toàn.
- KHÔNG có <uses-permission android:name="android.permission.INTERNET"/>
  trong AndroidManifest (trừ khi user chủ động bật tính năng optional sau này).
- Không gửi đi: nội dung PDF, annotation, chữ ký, thumbnail, metadata.
- Audit dependency bắt buộc trước MỌI release (kể cả crash-reporting SDK mặc định).
```
- Thumbnail & Recent Files: chỉ lưu trong internal storage (`/data/data/.../cache/thumbnails/`), không bao giờ lưu vào `Pictures/`/`Downloads/`; có toggle "Clear recent + thumbnails on exit" và "Don't keep history".
- Signature asset (nhạy cảm hơn thumbnail — có thể dùng giả mạo chữ ký): cân nhắc mã hoá at-rest bằng Android Keystore cho thư mục `signatures/` — P1, tách riêng khỏi chính sách thumbnail chung.
- App Lock: bật `FLAG_SECURE` để ẩn preview trong Recent Apps khi tính năng này được bật.
- **Play Store Release Gate (P1, bắt buộc trước khi submit):** chạy Network Profiler trên **bản release** (không phải debug) để xác nhận 0 byte outbound, khớp với khai báo trong Play Console Data Safety form. Ngoài ra cần layout responsive tối thiểu để không bị letterbox/giảm ranking trên tablet/foldable theo chính sách large-screen hiện hành của Google Play.

### ADR-009 — Conflict Detection
- Phát hiện: so sánh `lastModified` + `size` (hoặc hash 1KB đầu) hiện tại của file gốc với `sourceFingerprint` đã lưu trong Project.
- Nếu phát hiện file gốc bị sửa từ bên ngoài (vd. Google Drive sync đè file) trong lúc app đang mở → **khóa edit**, hiển thị: *"File gốc đã thay đổi bên ngoài app. [Tải lại (bỏ thay đổi)] hoặc [Xuất bản sao mới]"*. Không bao giờ âm thầm ghi đè.

---

## 6. UX Flows chính (5 flow, giữ tối giản)

```
Flow 1 — Annotate
Open PDF → Viewer → chọn Highlight → drag chọn text →
chọn màu → ghi vào Project JSON → autosave → undo khả dụng

Flow 2 — Sign
Tap Sign → Draw/Use saved → lưu PNG trong internal storage →
đặt vị trí → resize → ghi vào Project JSON

Flow 3 — Organize
Tap Pages → thumbnail grid → long-press drag reorder /
multi-select rotate/delete/extract → cập nhật pageOrder → autosave

Flow 4 — Save/Export
Tap Save → kiểm tra có thay đổi? → flatten annotation vào file tạm →
atomic write (.tmp → fsync → rename) → cập nhật metadata

Flow 5 — Discard/Recovery
Rời viewer có thay đổi chưa lưu → [Continue][Save][Discard]
App bị kill giữa chừng → mở lại → đọc journal.json →
"Recover unsaved changes?"
```

---

## 7. Definition of Done — MVP Acceptance Criteria

| Hạng mục | Tiêu chí đạt |
|---|---|
| **Open & Render** | Cold open PDF 100 trang < 1.5s. Cuộn mượt ≥ 50 FPS trên máy 4-6GB RAM. |
| **Annotation round-trip** | Add highlight/pen → Save → Close → Reopen bằng Adobe Reader/Foxit → annotation giữ nguyên vị trí, màu, thuộc tính chuẩn PDF (QuadPoints). |
| **Page identity round-trip** | Highlight trang X → Reorder/Delete trang khác → Export → highlight vẫn đúng nội dung trang ban đầu (ADR-007). |
| **Page Operations** | Đổi thứ tự 3 trang → Export → mở lại đúng cấu trúc, đúng `/Rotate` entry. |
| **External-open flow** | Mở PDF từ Gmail/Drive → thoát app → mở lại từ Recent → hoạt động đúng hoặc báo lỗi rõ ràng (ADR-008). |
| **Crash Safety** | Kill app giữa lúc edit → mở lại → "Phục hồi phiên làm việc" thành công, file gốc không hỏng. |
| **Existing annotations** | PDF có annotation từ Adobe/Foxit → mở, hiển thị, rotate/reorder/export → annotation không bị mất. |
| **Data Isolation** | Network Profiler trên bản release: 0 bytes outbound traffic. |
| **Performance budget** | Page turn < 150ms; annotation stroke latency < 16ms; không OOM với PDF scan 150 trang/50MB. |

---

## 8. Golden PDF Test Suite

```
test/fixtures/pdf/
 ├── simple.pdf
 ├── unicode.pdf          (test riêng: text tiếng Việt có dấu trong Text Box)
 ├── scanned.pdf
 ├── forms.pdf
 ├── encrypted.pdf
 ├── existing_annotations.pdf   (từ Adobe/Foxit — test preservation)
 ├── large.pdf             (>50MB)
 └── malformed.pdf
```
Mỗi file test theo chu trình: `open → render → search → annotate → modify (rotate/reorder/delete) → save → reopen → export → verify` — verify PDF output thực sự đúng (không chỉ UI hiển thị đúng).

---

## 9. Roadmap thực thi

**Không dựng Flutter UI skeleton trước khi khóa ADR + Spike engine.**

```
Bước 1  Khóa Engineering Contracts (ADR-001 đến ADR-009)
Bước 2  PDF Engine Spike (10 test cases + round-trip save)
Bước 3  Golden PDF Test Suite
Bước 4  Project model + Journal + Crash recovery POC
Bước 5  Coordinate mapper POC + Page Identity model POC
Bước 6  SAF + Intent (ACTION_VIEW/SEND) persistence POC
Bước 7  Domain Layer (DocumentManager, AnnotationManager, CommandStack)
Bước 8  Viewer + Annotation UI
Bước 9  Page Ops + Signature UI
Bước 10 Hardening: performance, OEM background-kill testing, Play Store
        release readiness (network audit bản release + large-screen test)
```

**Nếu triển khai gấp (3-7 ngày cho spike đầu tiên):** chỉ làm Bước 1-4 + phần tối thiểu của Viewer/Highlight/Export overlay, dùng package PDF có sẵn (pdfrx/pdfx) thay vì tự viết FFI, và coi đây là gate quyết định tiếp tục hay không — không nhồi toàn bộ P0 vào 7 ngày.

---

## 10. Monetization

**Free + Donation (khuyến nghị chính, đồng thuận qua mọi vòng review):**
- 100% miễn phí, không ads, không tracking, open-source (GitHub).
- GitHub Sponsors / Buy Me a Coffee / Liberapay.
- Nếu cân nhắc Pro features (merge/split nâng cao, OCR) sau này: phải chạy 100% local, và cần quyết định sớm là open-source thuần (rủi ro: user hỏi "sao phải trả tiền cho code tôi tự build được") hay tách bản Pro closed-source riêng — tránh mập mờ vì ảnh hưởng trực tiếp đến license/dependency selection.

---

## 11. Risk Matrix (tổng hợp toàn bộ, đã loại trùng lặp)

| Risk | Mức độ | Mitigation |
|---|---|---|
| PDF engine không đủ mạnh | Critical | Spike POC 10 test case trước UI |
| Page identity bug (annotation lệch trang) | Critical | ADR-007 — pageId thay vì pageIndex |
| Mất annotation có sẵn khi rotate/reorder | Critical | ADR-004 — preserve rule bắt buộc |
| Scope creep | Critical | Giữ nghiêm P0/P1/P2, từ chối mọi thứ ngoài P0 ở MVP |
| Memory crash file lớn | High | Lazy/tiled rendering, LRU cache, Isolate |
| License conflict | High | Audit BSD/MIT/Apache trước khi tích hợp |
| Android SAF/Scoped Storage | High | ADR-002, test Android 11-16 |
| Intent từ app khác (Gmail/Drive) mất quyền | High | ADR-008 — persist permission ngay khi nhận |
| Data loss khi crash | High | Atomic write + journal.json |
| OEM background killer (MIUI/EMUI) giết export | High | Foreground service cho export dài |
| Play Store Data Safety / large-screen compliance | High | Network audit bản release + responsive layout trước submit |
| Font/Unicode (đặc biệt tiếng Việt) | Medium | Embed Noto Sans, test riêng trong Golden Suite |
| APK size do native PDFium libs | Medium | Build AAB + per-ABI splits |
| Signature asset bị lộ/giả mạo | Medium | Mã hoá Keystore riêng cho `signatures/` (P1) |
| Kỳ vọng sai về "Edit text" | Medium | Không bao giờ quảng cáo true text editing ở MVP |

---

## 12. Đánh giá cuối cùng

| Khía cạnh | Điểm |
|---|---|
| Product vision & positioning | 9.5/10 |
| MVP feature selection | 9/10 |
| Architecture high-level | 8.5/10 |
| Engineering contracts (sau khi bổ sung ADR-007, ADR-008, ADR-009) | 9/10 |
| Platform-specific readiness (Android SAF, Intent, Play Store) | 8.5/10 |
| Testing strategy (Golden Suite) | 8.5/10 |
| **Implementation readiness tổng thể** | **9/10** (từ 5-7/10 ở các bản trước) |

**Kết luận:** Bản này là điểm hội tụ của toàn bộ 11 review — không còn "điểm mù" lớn nào chưa được xử lý ở cấp kiến trúc. Bước tiếp theo duy nhất là: khóa 9 ADR ở Mục 5 thành văn bản chính thức (có thể tách file `ADR/` riêng theo từng số), sau đó bắt đầu PDF Engine Spike (Bước 2, Mục 9). Không cần thêm vòng review sản phẩm — chỉ cần review kỹ thuật khi Spike có kết quả thực tế.