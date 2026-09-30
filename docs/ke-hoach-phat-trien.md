Hướng làm nếu giữ Rasa
Giai đoạn 1: Làm cho luồng train "chuẩn production"

Chuyển train thành job bất đồng bộ bằng BullMQ. Bạn đã có sẵn Redis nên không cần thêm hạ tầng.
Lưu trạng thái train đầy đủ: queued → validating → training → loaded / failed, kèm log lỗi.
Đẩy tiến độ lên frontend qua SSE hoặc WebSocket. Đây là phần FE hay: trang train có timeline và log chạy trực tiếp.
Quản lý phiên bản model: danh sách model, xem model nào đang chạy, rollback về bản cũ bằng 1 click.
Validate dữ liệu ngay ở NestJS trước khi gửi sang Rasa.
Giai đoạn 2: Nâng trải nghiệm designer (thế mạnh của bạn)

Story/rule editor trên React Flow v12: kiểm tra lỗi ngay trên node, autocomplete intent/action, undo/redo.
Trang chat thử gọi /webhooks/rest/webhook, hiển thị intent và độ tin cậy của từng câu (từ /model/parse) ngay bên cạnh.
Chạy rasa test và hiện confusion matrix giữa các intent để biết intent nào hay bị nhầm. Đây là tính năng rất đắt giá mà ít tool tự làm có.
Giai đoạn 3: Lai với LLM (không bỏ Rasa)

Đây là cách giữ base Rasa mà vẫn bắt kịp 2026:

Sinh dữ liệu train bằng LLM: người dùng nhập 3 câu mẫu, LLM gợi ý thêm 20 câu tương tự để họ duyệt.
LLM fallback: khi độ tin cậy dưới ngưỡng, chuyển câu hỏi sang LLM + RAG thay vì trả lời "Tôi không hiểu".
Đây cũng chính là hướng Rasa CALM đang đi, nên câu chuyện khi phỏng vấn rất mạch lạc.
